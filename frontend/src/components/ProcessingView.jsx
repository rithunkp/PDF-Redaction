import { useAppState, useAppDispatch } from '../context/AppContext';
import * as api from '../api';

export default function ProcessingView() {
  const { sessionId, filename, isExporting, redactions } = useAppState();
  const dispatch = useAppDispatch();

  const handleBack = () => {
    dispatch({ type: 'SET_VIEW', view: 'workspace' });
  };

  const handleDownload = async () => {
    if (!sessionId) return;
    dispatch({ type: 'SET_LOADING', key: 'isExporting', value: true });

    try {
      const res = await api.exportPDF(sessionId, true);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename?.replace('.pdf', '_redacted.pdf') || 'redacted.pdf';
      a.click();
      URL.revokeObjectURL(url);
      dispatch({ type: 'SET_TOAST', toast: { type: 'success', message: 'PDF downloaded successfully!' } });
    } catch (e) {
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'isExporting', value: false });
    }
  };

  return (
    <div className="processing-view">
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.5rem 1rem', background: 'var(--surface-container-high)',
          borderRadius: '9999px', border: '1px solid rgba(70,69,84,0.1)',
          marginBottom: '1rem',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--primary)', animation: 'pulse 2s ease-in-out infinite'
          }} />
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: '0.75rem',
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: 'var(--primary)'
          }}>
            {isExporting ? 'Processing' : 'Ready to Export'}
          </span>
        </div>

        <h1>{isExporting ? 'Sanitizing Document...' : 'Document Ready'}</h1>
        <p>
          {isExporting
            ? 'Applying redactions and flattening document to ensure zero PII leakage.'
            : `${redactions.length} redaction${redactions.length !== 1 ? 's' : ''} will be permanently applied to ${filename}.`
          }
        </p>
      </div>

      {isExporting && (
        <div className="progress-bar-wrap">
          <div className="progress-bar">
            <div className="progress-bar-fill primary-gradient" style={{ width: '75%' }} />
          </div>
        </div>
      )}

      <div className="processing-actions">
        <button className="btn-back" onClick={handleBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Editor
        </button>
        <button
          className="btn-download primary-gradient"
          onClick={handleDownload}
          disabled={isExporting}
        >
          <span className="material-symbols-outlined">cloud_download</span>
          {isExporting ? 'Processing...' : 'Download Sanitized PDF'}
        </button>
      </div>
    </div>
  );
}
