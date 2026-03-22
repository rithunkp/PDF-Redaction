# PDF Redaction Tool

A comprehensive system for automatically redacting sensitive and confidential information in PDF documents.
This tool utilizes a highly accurate **Multi-Method Redaction Engine** combining advanced Regular Expressions with state-of-the-art Natural Language Processing (NLP) to detect and protect PII (Personally Identifiable Information).

Initially built as a Python/Tkinter desktop application, it has now been modernized into a production-grade **Web Application** using a **React** frontend and a **Flask** backend API.

## Key Features

- **Multi-Method Detection Pipeline**:
  - **Advanced Regex**: Instantly catches structured data like Emails, Phone Numbers, SSNs, Credit Cards, IBANs, and IP Addresses.
  - **Smart NLP/NER (Spacy)**: Contextually identifies unstructured PII such as People's Names, Organizations, and Locations/Geopolitical Entities.
- **Auto-masking**: Preserves context by gracefully masking data (e.g., `x****@gmail.com`, `***-**-1234`) instead of just placing a black box over regex matches.
- **Absolute Redaction**: Applies unrecoverable black boxes over identified NLP entities to ensure total confidentiality.
- **Modern Web Interface**: A clean React-based UI allows users to view PDFs, toggle specific redaction patterns, run the NLP engine, and review/modify redactions before final export.
- **Legacy Support**: The original Tkinter GUI and CLI are still available for local, offline desktop use.

## Tech Stack

- **Frontend**: React 19, Vite, standard CSS
- **Backend**: Python 3, Flask, Flask-CORS
- **PDF Processing**: PyMuPDF (`fitz`) for high-performance parsing and rendering
- **NLP**: Spacy (`en_core_web_sm`) for Named Entity Recognition

## Getting Started (Web Application)

### 1. Setup Backend

Navigate to the `backend` directory and install the dependencies:

```bash
cd backend
pip install -r requirements.txt
```

*(Optional but Recommended)* Download the Spacy NLP model if you wish to use smart detection for Names, Organizations, and Locations:
```bash
python -m spacy download en_core_web_sm
```

Start the Flask development server:
```bash
python app.py
```
The backend will run on `http://localhost:5000`.

### 2. Setup Frontend

Open a new terminal, navigate to the `frontend` directory, and install dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
The frontend will typically run on `http://localhost:5173`. Open this URL in your browser to use the app.

## Legacy Usage (Desktop App & CLI)

If you prefer to run the application locally without a browser:

### Graphical User Interface (Tkinter)
Ensure requirements are installed (`pip install -r requirements.txt`), then run:
```bash
python gui.py
```

### Command Line Interface (CLI)
Run the tool directly from the terminal for automated workflows:
```bash
# Basic usage (NLP enabled by default)
python main.py input.pdf output_redacted.pdf

# Run with Regex only (faster, no NLP)
python main.py input.pdf output_redacted.pdf false
```

## How It Works

1. **Upload & Parse**: The PDF is uploaded to the backend and parsed using PyMuPDF. The document is stored in an in-memory session.
2. **Detection**: Users select patterns (Regex) or use NLP. The backend processes the document text block-by-block, locating exact string matches or Spacy entities (`PERSON`, `ORG`, `GPE`).
3. **Review**: Detected entities are returned to the React frontend where they are drawn as bounding boxes over an image rendering of the PDF page. Users can approve, delete, or manually draw new redactions.
4. **Export**: Once finalized, the document is sanitized. All confirmed bounding boxes are overwritten with unselectable shapes/text directly onto the PDF canvas, and the new PDF is downloaded.
