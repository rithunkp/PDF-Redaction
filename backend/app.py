"""
Flask app — all routes for the PDF Redaction web application.
In-memory session management, CORS for dev, all endpoints per API contract.
"""

import io
import sys
import uuid
import time
import threading
from datetime import datetime

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

import pdf_service
import detection_service

# ─── Try to load Spacy ───
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None
    print("WARNING: Spacy model not available. NLP detection will be disabled.")
    print("  Run: python -m spacy download en_core_web_sm")

# ─── Flask App ───
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─── In-Memory Session Store ───
# { session_id: { "doc_bytes": bytes, "doc": fitz.Document, "filename": str,
#                 "page_count": int, "redactions": [...], "created_at": float,
#                 "last_active": float } }
sessions = {}
SESSION_TTL = 2 * 60 * 60  # 2 hours


def get_session(session_id):
    """Get session or raise error."""
    s = sessions.get(session_id)
    if not s:
        return None
    s["last_active"] = time.time()
    return s


def cleanup_sessions():
    """Remove expired sessions every 10 minutes."""
    while True:
        time.sleep(600)
        now = time.time()
        expired = [sid for sid, s in sessions.items() if now - s["last_active"] > SESSION_TTL]
        for sid in expired:
            s = sessions.pop(sid, None)
            if s and s.get("doc"):
                try:
                    s["doc"].close()
                except Exception:
                    pass


cleanup_thread = threading.Thread(target=cleanup_sessions, daemon=True)
cleanup_thread.start()


# ─── Helpers ───

def ok(data):
    return jsonify({"success": True, "data": data, "error": None})


def err(message, status=400):
    return jsonify({"success": False, "data": None, "error": message}), status


# ─── PDF Routes ───

@app.route("/api/pdf/upload", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return err("No file provided.")

    file = request.files["file"]
    if not file.filename:
        return err("No file selected.")

    file_bytes = file.read()

    try:
        doc = pdf_service.validate_pdf(file_bytes)
    except ValueError as e:
        return err(str(e))

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "doc_bytes": file_bytes,
        "doc": doc,
        "filename": file.filename,
        "page_count": len(doc),
        "redactions": [],
        "detected_matches": [],
        "created_at": time.time(),
        "last_active": time.time(),
    }

    return ok({
        "session_id": session_id,
        "filename": file.filename,
        "page_count": len(doc),
        "file_size_bytes": len(file_bytes),
    })


@app.route("/api/pdf/<session_id>/page/<int:page_number>")
def get_page(session_id, page_number):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    try:
        result = pdf_service.render_page(s["doc"], page_number)
    except ValueError as e:
        return err(str(e))

    return ok(result)


@app.route("/api/pdf/<session_id>/text-layer/<int:page_number>")
def get_text_layer(session_id, page_number):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    try:
        blocks = pdf_service.get_text_layer(s["doc"], page_number)
    except ValueError as e:
        return err(str(e))

    return ok({"blocks": blocks})


@app.route("/api/pdf/<session_id>/export", methods=["POST"])
def export_pdf(session_id):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    body = request.get_json(silent=True) or {}
    flatten = body.get("flatten", True)

    try:
        # Only apply confirmed redactions (status = "applied" or all pending ones)
        redactions_to_apply = [r for r in s["redactions"]]
        result_bytes = pdf_service.export_pdf(
            s["doc_bytes"],
            redactions_to_apply,
        )
    except Exception as e:
        return err(f"Export failed: {str(e)}", 500)

    return send_file(
        io.BytesIO(result_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=s["filename"].replace(".pdf", "_redacted.pdf"),
    )


# ─── Redaction Routes ───

@app.route("/api/redactions/<session_id>")
def list_redactions(session_id):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    return ok({"redactions": s["redactions"]})


@app.route("/api/redactions/<session_id>", methods=["POST"])
def add_redaction(session_id):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    body = request.get_json()
    if not body:
        return err("Request body required.")

    page = body.get("page")
    bbox = body.get("bbox")
    label = body.get("label", None)
    source = body.get("source", "manual")

    if not page or not bbox:
        return err("page and bbox are required.")

    if page < 1 or page > s["page_count"]:
        return err(f"Page must be between 1 and {s['page_count']}.")

    # Validate bbox
    if len(bbox) != 4:
        return err("bbox must have 4 values: [x0, y0, x1, y1].")

    x0, y0, x1, y1 = bbox
    # Ensure x0 < x1, y0 < y1
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0

    # Clamp to page bounds
    page_rect = s["doc"][page - 1].rect
    x0 = max(0, min(x0, page_rect.width))
    y0 = max(0, min(y0, page_rect.height))
    x1 = max(0, min(x1, page_rect.width))
    y1 = max(0, min(y1, page_rect.height))

    redaction = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "page": page,
        "bbox": [x0, y0, x1, y1],
        "label": label,
        "source": source,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }

    s["redactions"].append(redaction)
    return ok({"redaction": redaction})


@app.route("/api/redactions/<session_id>/<redaction_id>", methods=["DELETE"])
def delete_redaction(session_id, redaction_id):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    before = len(s["redactions"])
    s["redactions"] = [r for r in s["redactions"] if r["id"] != redaction_id]

    if len(s["redactions"]) == before:
        return err("Redaction not found.", 404)

    return ok({"deleted": True})


@app.route("/api/redactions/<session_id>", methods=["DELETE"])
def clear_redactions(session_id):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    body = request.get_json(silent=True) or {}
    page = body.get("page")

    if page:
        before = len(s["redactions"])
        s["redactions"] = [r for r in s["redactions"] if r["page"] != page]
        deleted = before - len(s["redactions"])
    else:
        deleted = len(s["redactions"])
        s["redactions"] = []

    return ok({"deleted_count": deleted})


# ─── Detection Routes ───

@app.route("/api/detect/<session_id>", methods=["POST"])
def detect(session_id):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    body = request.get_json()
    if not body:
        return err("Request body required.")

    page = body.get("page", "all")
    patterns = body.get("patterns", [])
    use_nlp = body.get("use_nlp", False)

    matches = []

    if page == "all":
        matches = detection_service.detect_all_pages(
            s["doc"], patterns, nlp if use_nlp else None
        )
    else:
        if patterns:
            matches.extend(detection_service.detect_patterns(s["doc"], page, patterns))
        if use_nlp and nlp:
            matches.extend(detection_service.detect_nlp(s["doc"], page, nlp))

    # Store matches in session for later apply
    s["detected_matches"] = matches

    return ok({"matches": matches})


@app.route("/api/detect/<session_id>/apply", methods=["POST"])
def apply_detected(session_id):
    s = get_session(session_id)
    if not s:
        return err("Session not found.", 404)

    body = request.get_json()
    if not body:
        return err("Request body required.")

    match_ids = body.get("match_ids", [])
    match_ids_set = set(match_ids)

    applied = []
    for match in s.get("detected_matches", []):
        if match["id"] in match_ids_set:
            redaction = {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "page": match["page"],
                "bbox": match["bbox"],
                "label": match.get("pattern_type", match.get("text", "")),
                "source": "auto",
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
            }
            s["redactions"].append(redaction)
            applied.append(redaction)

    return ok({"applied_count": len(applied), "redactions": applied})


# ─── Run ───

if __name__ == "__main__":
    app.run(debug=True, port=5000)
