# PDF Redaction Tool

A Python-based system for automatically redacting sensitive information in PDF documents.  
The tool detects specified text patterns and replaces them with black boxes to protect confidential data.

## Features

- Automatic detection of sensitive text patterns
- Redaction of selected regions in PDFs
- Supports masking of emails, phone numbers, and IDs
- Generates a clean redacted document
- Lightweight and easy to extend

## Tech Stack

- Python
- PyMuPDF (fitz)
- Regex
- PDF text extraction

## How It Works

1. Extract text and coordinates from the PDF
2. Identify sensitive patterns using regex
3. Locate text regions in the document
4. Overlay black rectangles to redact the content
5. Export the sanitized PDF

## Installation

Clone the repository

```bash
git clone https://github.com/yourusername/pdf-redaction-tool.git
cd pdf-redaction-tool
```

Install dependencies

```bash
pip install -r requirements.txt
```

## Usage

Run:

```bash
python main.py input.pdf output.pdf
```

Example:

```bash
python main.py confidential_report.pdf redacted_report.pdf
```

## Example Redactions

Sensitive information automatically detected:

- Email addresses
- Phone numbers
- Identification numbers

Output PDF contains masked sections.

## Future Improvements

- Named Entity Recognition for automatic PII detection
- GUI interface
- OCR support for scanned PDFs
- Custom redaction rules
