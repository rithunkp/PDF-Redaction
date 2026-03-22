import { useAppState, useAppDispatch } from '../context/AppContext';

export default function SideNav() {
  const { view, filename } = useAppState();
  const dispatch = useAppDispatch();

  const nav = (viewName) => () => dispatch({ type: 'SET_VIEW', view: viewName });

  return (
    <aside className="sidenav">
      {/* Brand */}
      <div className="sidenav-brand">
        <div className="sidenav-brand-icon primary-gradient">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-primary-container)' }}>
            enhanced_encryption
          </span>
        </div>
        <div>
          <h1>The Vault</h1>
          <p>Secure Redaction</p>
        </div>
      </div>

      {/* New Redaction */}
      <div className="sidenav-cta">
        <button className="primary-gradient" onClick={nav('dashboard')}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          New Redaction
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidenav-nav">
        <button
          className={`sidenav-link ${view === 'dashboard' ? 'active' : ''}`}
          onClick={nav('dashboard')}
        >
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </button>
        <button
          className={`sidenav-link ${view === 'workspace' || view === 'processing' ? 'active' : ''}`}
          onClick={nav('workspace')}
          disabled={!filename}
          style={!filename ? { opacity: 0.4 } : {}}
        >
          <span className="material-symbols-outlined">edit_document</span>
          Workspace
        </button>
      </nav>

      {/* Footer */}
      <div className="sidenav-footer">
        <button className="sidenav-link">
          <span className="material-symbols-outlined">settings</span>
          Settings
        </button>
      </div>
    </aside>
  );
}
