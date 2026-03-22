import { useAppState, useAppDispatch } from '../context/AppContext';
import * as api from '../api';

export default function DetectionPanel() {
  const { detectedMatches, selectedMatchIds, sessionId } = useAppState();
  const dispatch = useAppDispatch();

  if (detectedMatches.length === 0) return null;

  // Group matches by pattern_type
  const groups = {};
  for (const m of detectedMatches) {
    const type = m.pattern_type || 'other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(m);
  }

  const selectedCount = selectedMatchIds.size;

  const toggleMatch = (id) => {
    dispatch({ type: 'TOGGLE_MATCH', id });
  };

  const handleApply = async () => {
    if (!sessionId || selectedCount === 0) return;
    try {
      const data = await api.applyDetected(sessionId, Array.from(selectedMatchIds));
      // Add applied redactions to state
      for (const r of data.redactions) {
        dispatch({ type: 'ADD_REDACTION', redaction: r });
      }
      dispatch({ type: 'CLEAR_MATCHES' });
      dispatch({
        type: 'SET_TOAST',
        toast: { type: 'success', message: `Applied ${data.applied_count} redactions.` },
      });
    } catch (e) {
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    }
  };

  const handleClear = () => {
    dispatch({ type: 'CLEAR_MATCHES' });
  };

  const TYPE_LABELS = {
    email: 'Emails',
    phone: 'Phone Numbers',
    ssn: 'SSNs / Identifiers',
    credit_card: 'Credit Cards',
    date: 'Dates & Times',
    iban: 'IBANs',
    ip_address: 'IP Addresses',
    person: 'People',
    org: 'Organizations',
    gpe: 'Locations',
    other: 'Other',
  };

  return (
    <aside className="detection-panel">
      <div className="detection-panel-header">
        <h2>Detected PII</h2>
        <p>Auto-scan results — review before applying</p>
      </div>

      <div className="detection-panel-list">
        {Object.entries(groups).map(([type, matches]) => (
          <div key={type}>
            <div className="entity-group-label">
              {TYPE_LABELS[type] || type} ({matches.length})
            </div>
            {matches.map(m => (
              <div
                key={m.id}
                className={`entity-item ${type === 'ssn' ? 'flagged' : ''}`}
                onClick={() => toggleMatch(m.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedMatchIds.has(m.id)}
                  onChange={() => toggleMatch(m.id)}
                  onClick={e => e.stopPropagation()}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="entity-text">{m.text}</div>
                  <div className="entity-meta">Page {m.page}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="detection-panel-footer">
        <div className="summary">
          <span>Selected Items</span>
          <span className="count">{selectedCount} Total</span>
        </div>
        <button
          className="btn-redact-all primary-gradient"
          onClick={handleApply}
          disabled={selectedCount === 0}
        >
          Redact All Selected
        </button>
        <button className="btn-clear" onClick={handleClear}>
          Clear Suggestions
        </button>
      </div>
    </aside>
  );
}
