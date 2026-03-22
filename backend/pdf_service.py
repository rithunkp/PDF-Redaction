"""
PDF Service — handles PDF loading, page rendering, and export.
Migrated from gui.py: all Tkinter code removed, pure PDF logic preserved.
"""

import io
import re
import base64
import fitz  # PyMuPDF


# ─── Masking helpers (verbatim from gui.py) ───

def mask_email(email):
    """x****@gmail.com"""
    at_pos = email.find('@')
    if at_pos > 0:
        return email[0] + '*' * (at_pos - 1) + email[at_pos:]
    return email


def mask_phone(phone):
    """***-***-1234"""
    digits = re.sub(r'[^0-9]', '', phone)
    if len(digits) >= 10:
        masked_digits = '*' * (len(digits) - 4) + digits[-4:]
        result = phone
        digit_pos = 0
        for i, char in enumerate(phone):
            if char.isdigit() and digit_pos < len(masked_digits):
                result = result[:i] + masked_digits[digit_pos] + result[i + 1:]
                digit_pos += 1
        return result
    return phone


def mask_number(text, keep_last=4):
    """****1234"""
    digits = re.sub(r'[^0-9]', '', text)
    if len(digits) > keep_last:
        return '*' * (len(digits) - keep_last) + digits[-keep_last:]
    return '*' * len(digits)


def mask_ssn(ssn):
    """***-**-1234"""
    parts = ssn.split('-')
    if len(parts) == 3:
        return '***-**-' + parts[2]
    return ssn


# ─── PDF loading ───

def validate_pdf(file_bytes):
    """Check PDF magic bytes, size, and encryption."""
    if len(file_bytes) > 50 * 1024 * 1024:
        raise ValueError("File too large. Maximum size is 50MB.")

    if not file_bytes[:5] == b'%PDF-':
        raise ValueError("Invalid file. Only PDF files are accepted.")

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        raise ValueError("Could not open file. It may be corrupted.")

    if doc.is_encrypted:
        doc.close()
        raise ValueError("Encrypted/password-protected PDFs are not supported.")

    return doc


def render_page(doc, page_number, dpi=144):
    """Render a PDF page to a base64-encoded PNG image."""
    if page_number < 1 or page_number > len(doc):
        raise ValueError(f"Page {page_number} out of range (1-{len(doc)}).")

    page = doc[page_number - 1]
    pix = page.get_pixmap(dpi=dpi)
    img_bytes = pix.tobytes("png")
    img_base64 = base64.b64encode(img_bytes).decode("utf-8")

    # Page dimensions in PDF points (for coordinate mapping)
    rect = page.rect
    return {
        "image_base64": img_base64,
        "width": rect.width,
        "height": rect.height,
        "page_number": page_number,
        "total_pages": len(doc),
    }


def get_text_layer(doc, page_number):
    """Extract text blocks with bounding boxes for auto-detection highlighting."""
    if page_number < 1 or page_number > len(doc):
        raise ValueError(f"Page {page_number} out of range (1-{len(doc)}).")

    page = doc[page_number - 1]
    blocks = page.get_text("blocks")
    result = []
    for block in blocks:
        # block = (x0, y0, x1, y1, text, block_no, block_type)
        if block[6] == 0:  # text block (not image)
            result.append({
                "text": block[4].strip(),
                "bbox": [block[0], block[1], block[2], block[3]],
                "block_type": "text",
            })
    return result


def export_pdf(doc_bytes, redactions, selected_patterns=None, use_nlp=False, nlp=None):
    """
    Apply redactions to the PDF and return the flattened result.

    Two types of redactions are applied:
    1. Manual/confirmed redactions from the user (black boxes)
    2. Optionally: auto-detection regex + NLP (migrated from gui.py)

    Uses PyMuPDF's formal redaction API for security:
    page.add_redact_annot() → page.apply_redactions()
    """
    doc = fitz.open(stream=doc_bytes, filetype="pdf")

    # Group redactions by page
    redactions_by_page = {}
    for r in redactions:
        pg = r["page"]
        if pg not in redactions_by_page:
            redactions_by_page[pg] = []
        redactions_by_page[pg].append(r)

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_redactions = redactions_by_page.get(page_num + 1, [])

        # Apply manual/confirmed redactions (black boxes)
        for r in page_redactions:
            bbox = r["bbox"]
            rect = fitz.Rect(bbox[0], bbox[1], bbox[2], bbox[3])
            # Clamp to page bounds
            rect = rect & page.rect
            if rect.is_empty:
                continue
            page.add_redact_annot(rect, fill=(0, 0, 0))

        # If auto-detection patterns are also requested during export,
        # run the original gui.py logic (regex masking + NLP black boxes)
        if selected_patterns:
            _apply_regex_redactions(page, selected_patterns)

        if use_nlp and nlp:
            _apply_nlp_redactions(page, nlp)

        # Apply all redaction annotations → burns into pixels (security-critical)
        page.apply_redactions()

    # Save to bytes
    output = io.BytesIO()
    doc.save(output)
    doc.close()
    return output.getvalue()


def _apply_regex_redactions(page, patterns):
    """Apply regex-based masking (white box + masked text). From gui.py."""
    PATTERN_MAP = {
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
        'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
        'credit_card': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
        'iban': r'\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b',
        'ip_address': r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
    }

    words = page.get_text("words")
    for word_info in words:
        word_text = word_info[4]
        word_bbox = fitz.Rect(word_info[0], word_info[1], word_info[2], word_info[3])

        for pattern_name in patterns:
            pattern = PATTERN_MAP.get(pattern_name)
            if not pattern:
                continue
            if re.fullmatch(pattern, word_text):
                if pattern_name == 'email':
                    masked = mask_email(word_text)
                elif pattern_name == 'phone':
                    masked = mask_phone(word_text)
                elif pattern_name == 'ssn':
                    masked = mask_ssn(word_text)
                elif pattern_name in ('credit_card', 'iban'):
                    masked = mask_number(word_text, 4)
                else:
                    masked = '*' * len(word_text)

                if masked != word_text:
                    page.draw_rect(word_bbox, color=(1, 1, 1), fill=(1, 1, 1))
                    font_size = max(8, min(12, word_bbox.height * 0.8))
                    page.insert_text(
                        (word_bbox.x0, word_bbox.y1 - 2),
                        masked,
                        fontsize=font_size,
                        color=(0, 0, 0),
                    )
                break


def _apply_nlp_redactions(page, nlp):
    """Apply NLP-based redactions (black boxes). From gui.py."""
    target_entities = {"PERSON", "ORG", "GPE"}
    blocks = page.get_text("blocks")

    for block in blocks:
        block_text = block[4].strip()
        if not block_text:
            continue

        nlp_doc = nlp(block_text)
        for ent in nlp_doc.ents:
            if ent.label_ in target_entities:
                ent_text = ent.text.strip()

                # Strict filtering (preserved from gui.py)
                if len(ent_text) <= 2:
                    continue
                if not any(c.isupper() for c in ent_text):
                    continue
                if ent_text.replace(" ", "").replace(".", "").replace(",", "").replace("-", "").isdigit():
                    continue
                if ent.label_ == "PERSON" and " " not in ent_text:
                    continue

                text_rects = page.search_for(ent_text, quads=False)
                for rect in text_rects:
                    page.add_redact_annot(rect, fill=(0, 0, 0))
