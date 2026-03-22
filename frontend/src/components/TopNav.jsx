import { useAppState, useAppDispatch } from '../context/AppContext';
import * as api from '../api';

export default function TopNav() {
  const { filename, sessionId, isExporting, redactions } = useAppState();
  const dispatch = useAppDispatch();

  const handleExport = async () => {
    if (!sessionId) return;
    dispatch({ type: 'SET_LOADING', key: 'isExporting', value: true });
    dispatch({ type: 'SET_VIEW', view: 'processing' });

    try {
      const res = await api.exportPDF(sessionId, true);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename?.replace('.pdf', '_redacted.pdf') || 'redacted.pdf';
      a.click();
      URL.revokeObjectURL(url);
      dispatch({ type: 'SET_TOAST', toast: { type: 'success', message: 'PDF exported successfully!' } });
    } catch (e) {
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'isExporting', value: false });
    }
  };

  return (
    <header className="topnav">
      <div className="topnav-left">
        <span className="topnav-title">{filename || 'The Vault Editorial'}</span>
        {sessionId && (
          <div className="topnav-status">
            <div className="dot" />
            <span>Active</span>
          </div>
        )}
      </div>

      <div className="topnav-right">
        {sessionId && (
          <div className="topnav-actions">
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: '0.7rem',
              color: 'var(--on-surface-variant)', textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              {redactions.length} redaction{redactions.length !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-primary primary-gradient"
              onClick={handleExport}
              disabled={isExporting || redactions.length === 0}
            >
              {isExporting ? 'Exporting...' : 'Finalize & Download'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
