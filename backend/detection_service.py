"""
Detection Service — regex pattern matching + NLP entity detection.
Migrated from gui.py: runs patterns on PDF text, returns matches for user review.
Does NOT auto-apply — returns results with bboxes for the frontend to display.
"""

import re
import uuid
import fitz  # PyMuPDF

# ─── Pattern definitions (from gui.py) ───

PATTERNS = {
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'phone': r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
    'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
    'credit_card': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
    'date': r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
    'iban': r'\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b',
    'ip_address': r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
}


def detect_patterns(doc, page_number, pattern_names):
    """
    Run regex patterns against PDF text on a specific page.
    Returns a list of matches with bboxes for the frontend to display.
    """
    if page_number < 1 or page_number > len(doc):
        raise ValueError(f"Page {page_number} out of range (1-{len(doc)}).")

    page = doc[page_number - 1]
    words = page.get_text("words")
    matches = []

    for word_info in words:
        word_text = word_info[4]
        word_bbox = [word_info[0], word_info[1], word_info[2], word_info[3]]

        for pname in pattern_names:
            pattern = PATTERNS.get(pname)
            if not pattern:
                continue
            if re.fullmatch(pattern, word_text):
                matches.append({
                    "id": str(uuid.uuid4()),
                    "text": word_text,
                    "bbox": word_bbox,
                    "pattern_type": pname,
                    "page": page_number,
                })
                break  # one match per word

    return matches


def detect_nlp(doc, page_number, nlp):
    """
    Run Spacy NER on a specific page.
    Strict filtering preserved from gui.py.
    Returns matches with bboxes for user review.
    """
    if page_number < 1 or page_number > len(doc):
        raise ValueError(f"Page {page_number} out of range (1-{len(doc)}).")

    page = doc[page_number - 1]
    target_entities = {"PERSON", "ORG", "GPE"}
    blocks = page.get_text("blocks")
    matches = []
    seen_texts = set()

    for block in blocks:
        block_text = block[4].strip()
        if not block_text:
            continue

        nlp_doc = nlp(block_text)
        for ent in nlp_doc.ents:
            if ent.label_ not in target_entities:
                continue

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

            # Avoid duplicates
            if ent_text in seen_texts:
                continue
            seen_texts.add(ent_text)

            # Find bounding box on the page
            text_rects = page.search_for(ent_text, quads=False)
            for rect in text_rects:
                matches.append({
                    "id": str(uuid.uuid4()),
                    "text": ent_text,
                    "bbox": [rect.x0, rect.y0, rect.x1, rect.y1],
                    "pattern_type": ent.label_.lower(),
                    "page": page_number,
                })

    return matches


def detect_all_pages(doc, pattern_names, nlp=None):
    """Run detection across all pages."""
    all_matches = []
    for pg in range(1, len(doc) + 1):
        if pattern_names:
            all_matches.extend(detect_patterns(doc, pg, pattern_names))
        if nlp:
            all_matches.extend(detect_nlp(doc, pg, nlp))
    return all_matches
