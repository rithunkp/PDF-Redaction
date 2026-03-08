import re
import sys
import fitz 
import spacy

# Load the English NLP model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spacy model 'en_core_web_sm'...")
    import subprocess
    subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

def redact(input_path, output_path, use_ner=True):
    doc = fitz.open(input_path)

    # Expanded patterns
    patterns = {
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
        'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
        'credit_card': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
        'iban': r'\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b', # Basic IBAN approximation
        'ip_address': r'\b(?:\d{1,3}\.){3}\d{1,3}\b', # IPv4
    }
    
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
                    result = result[:i] + masked_digits[digit_pos] + result[i+1:]
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

    # Entities we want to redact using strict NLP matching
    target_entities = {"PERSON", "ORG", "GPE"}

    # Process each page
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        print(f"Processing page {page_num + 1}...")

        # 1. Regex-based Redaction
        words = page.get_text("words") # (x0, y0, x1, y1, word, block_no, line_no, word_no)
        
        for word_info in words:
            word_text = word_info[4]
            word_bbox = fitz.Rect(word_info[0], word_info[1], word_info[2], word_info[3])
            
            # Check each regex pattern
            for pattern_name, pattern in patterns.items():
                if re.fullmatch(pattern, word_text):
                    if pattern_name == 'email':
                        masked_text = mask_email(word_text)
                    elif pattern_name == 'phone':
                        masked_text = mask_phone(word_text)
                    elif pattern_name == 'ssn':
                        masked_text = mask_ssn(word_text)
                    elif pattern_name in ['credit_card', 'iban']:
                        masked_text = mask_number(word_text, 4)
                    else:
                        masked_text = '*' * len(word_text)
                    
                    if masked_text != word_text:
                        print(f"[Regex] Found {pattern_name}: {word_text} -> {masked_text}")
                        # Cover original text with white rectangle
                        page.draw_rect(word_bbox, color=(1, 1, 1), fill=(1, 1, 1))
                        # Add masked text
                        font_size = max(8, min(12, word_bbox.height * 0.8))
                        page.insert_text((word_bbox.x0, word_bbox.y1 - 2), masked_text, fontsize=font_size, color=(0, 0, 0))
                    break

        # 2. NLP (NER) based Redaction
        if use_ner:
            # We process the text block by block so Spacy has context.
            blocks = page.get_text("blocks") 
            for block in blocks:
                block_text = block[4].strip()
                if not block_text:
                    continue
                
                # Run Spacy NER
                nlp_doc = nlp(block_text)
                
                for ent in nlp_doc.ents:
                    if ent.label_ in target_entities:
                        ent_text = ent.text.strip()
                        
                        # Strict filtering to prevent redacting normal text/substrings:
                        # 1. Must be longer than 2 characters
                        if len(ent_text) <= 2:
                            continue
                        # 2. Must contain at least one uppercase letter (Names/Orgs usually are Title Case)
                        if not any(c.isupper() for c in ent_text):
                            continue
                        # 3. Ignore pure numbers that might have been misclassified
                        if ent_text.replace(" ", "").replace(".", "").replace(",", "").replace("-", "").isdigit():
                            continue
                        # 4. Require PERSON entities to have at least two words (First Last) to avoid redacting 
                        #    normal capitalized words at the start of sentences (like 'Lorem', 'Duis').
                        if ent.label_ == "PERSON" and " " not in ent_text:
                            continue
                            
                        # Find occurrences of the entity text in the PDF page
                        text_rects = page.search_for(ent_text, quads=False)
                        for rect in text_rects:
                            print(f"[NER] Found {ent.label_}: {ent_text} -> {'*' * len(ent_text)}")
                            page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0)) # Absolute black box for names/orgs

    # Save the redacted PDF
    doc.save(output_path)
    doc.close()
    print(f"Redacted PDF saved to: {output_path}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python main.py <input_pdf> <output_pdf> [use_ner: true|false]")
        print("Example: python main.py document.pdf redacted.pdf true")
        return
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    use_ner = True
    if len(sys.argv) > 3 and sys.argv[3].lower() == 'false':
        use_ner = False
    
    print("Starting PDF redaction...")
    
    try:
        redact(input_pdf, output_pdf, use_ner)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()