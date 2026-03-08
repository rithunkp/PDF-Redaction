# PDF Redaction Tool (Finalized Product)

A comprehensive, Python-based system for automatically redacting sensitive and confidential information in PDF documents.  
This tool utilizes a highly accurate **Multi-Method Redaction Engine** combining advanced Regular Expressions with state-of-the-art Natural Language Processing (NLP) to detect and protect PII (Personally Identifiable Information).

## Key Features

- **Multi-Method Detection Pipeline**:
  - **Advanced Regex**: Instantly catches structured data like Emails, Phone Numbers, SSNs, Credit Cards, IBANs, and IP Addresses.
  - **Smart NLP/NER (Spacy)**: Contextually identifies unstructured PII such as People's Names, Organizations, and Locations/Geopolitical Entities.
- **Auto-masking**: Preserves context by gracefully masking data (e.g., `x****@gmail.com`, `***-**-1234`) instead of just placing a black box over regex matches.
- **Absolute Redaction**: Applies unrecoverable black boxes over identified NLP entities to ensure total confidentiality.
- **User-Friendly GUI**: A clean Tkinter interface allows users to toggle specific redaction patterns and the NLP engine based on their document's specific needs.

## Tech Stack

- **Python 3**
- **PyMuPDF (`fitz`)**: High-performance PDF parsing and text manipulation.
- **Spacy (`en_core_web_sm`)**: Industrial-strength NLP for robust Named Entity Recognition.
- **Tkinter**: Native Python GUI library.

## Installation

1. Clone the repository and navigate to the project directory.
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. *(Optional but Recommended)* The GUI will attempt to automatically download the required Spacy NLP model on first run if it is enabled. If you prefer to download it manually:
   ```bash
   python -m spacy download en_core_web_sm
   ```

## Usage

### Graphical User Interface (GUI)
Run the user-friendly graphical interface:
```bash
python gui.py
```
- Select your input PDF.
- Toggle the Regex patterns you want to redact.
- Check "Enable Smart NLP Redaction" to catch names, locations, and organizations.
- Click "Redact PDF".

### Command Line Interface (CLI)
Run the tool directly from the terminal for automated workflows:
```bash
# Basic usage (NLP enabled by default)
python main.py input.pdf redacted_output.pdf

# Run with Regex only (faster, no NLP)
python main.py input.pdf redacted_output.pdf false
```

## How It Works

1. **Extraction**: The system extracts bounding boxes and text from the PDF using PyMuPDF.
2. **Regex Pass**: Fast identification and masking of highly structured PII patterns.
3. **NLP Pass**: Text is fed block-by-block into the Spacy NLP pipeline. Entities matching `PERSON`, `ORG`, or `GPE` have their bounding boxes located.
4. **Sanitization**: All discovered coordinates are overwritten with unselectable shapes/text directly onto the PDF canvas.
5. **Export**: A new, clean, and sanitized PDF is written to the disk.
