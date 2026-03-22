import { useRef, useState } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import * as api from '../api';

export default function Dashboard() {
  const { isUploading } = useAppState();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: 'Please select a PDF file.' } });
      return;
    }

    dispatch({ type: 'SET_LOADING', key: 'isUploading', value: true });
    try {
      const data = await api.uploadPDF(file);
      dispatch({
        type: 'SET_SESSION',
        sessionId: data.session_id,
        filename: data.filename,
        pageCount: data.page_count,
      });

      // Load first page
      dispatch({ type: 'SET_LOADING', key: 'isLoadingPage', value: true });
      const page = await api.getPage(data.session_id, 1);
      dispatch({
        type: 'SET_PAGE_IMAGE',
        image: page.image_base64,
        width: page.width,
        height: page.height,
        pageNumber: 1,
      });
    } catch (e) {
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'isUploading', value: false });
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onChange = (e) => {
    handleFile(e.target.files[0]);
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <section className="dashboard-header">
        <div>
          <h2>Editorial Dashboard</h2>
          <p>Upload a PDF document to begin secure redaction.</p>
        </div>
      </section>

      {/* Dropzone */}
      <section>
        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <div className="dropzone-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--primary)' }}>
              {isUploading ? 'hourglass_top' : 'upload_file'}
            </span>
          </div>
          <h3>{isUploading ? 'Uploading...' : 'Upload PDF to The Vault'}</h3>
          <p>
            {isUploading
              ? 'Processing your document...'
              : <>Drag and drop or <span className="highlight">browse files</span></>
            }
          </p>
          <p className="meta">MAX FILE SIZE: 50MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={onChange}
          />
        </div>
      </section>
    </div>
  );
}
