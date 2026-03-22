import { useAppState, useAppDispatch } from '../context/AppContext';
import * as api from '../api';

export default function ToolSidebar() {
  const { activeTool, sessionId, isDetecting } = useAppState();
  const dispatch = useAppDispatch();

  const setTool = (tool) => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool });
  };

  const handleAutoScan = async () => {
    if (!sessionId) return;
    dispatch({ type: 'SET_LOADING', key: 'isDetecting', value: true });
    try {
      const data = await api.detect(sessionId, 'all', ['email', 'phone', 'ssn', 'credit_card', 'date'], true);
      dispatch({ type: 'SET_DETECTED_MATCHES', matches: data.matches });
      dispatch({ type: 'SET_TOAST', toast: { type: 'success', message: `Found ${data.matches.length} potential PII items.` } });
    } catch (e) {
      dispatch({ type: 'SET_LOADING', key: 'isDetecting', value: false });
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    }
  };

  return (
    <nav className="tool-sidebar">
      <button
        className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setTool('select')}
        title="Select"
      >
        <div className="icon-wrap">
          <span className="material-symbols-outlined">near_me</span>
        </div>
        <span className="label">Select</span>
      </button>

      <button
        className={`tool-btn ${activeTool === 'area' ? 'active' : ''}`}
        onClick={() => setTool('area')}
        title="Draw Redaction Area"
      >
        <div className="icon-wrap">
          <span className="material-symbols-outlined">format_shapes</span>
        </div>
        <span className="label">Area</span>
      </button>

      <div className="tool-divider" />

      <button
        className="tool-btn-auto"
        onClick={handleAutoScan}
        disabled={isDetecting || !sessionId}
        title="Auto Scan for PII"
      >
        <span
          className={`material-symbols-outlined ${isDetecting ? 'loading-spinner' : ''}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isDetecting ? 'refresh' : 'auto_fix_high'}
        </span>
      </button>
    </nav>
  );
}
