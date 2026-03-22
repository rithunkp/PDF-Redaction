import { useEffect } from 'react';
import './App.css';
import { AppProvider, useAppState, useAppDispatch } from './context/AppContext';
import SideNav from './components/SideNav';
import TopNav from './components/TopNav';
import Dashboard from './components/Dashboard';
import PDFViewer from './components/PDFViewer';
import ToolSidebar from './components/ToolSidebar';
import DetectionPanel from './components/DetectionPanel';
import ProcessingView from './components/ProcessingView';

function Toast() {
  const { toast } = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.type}`} onClick={() => dispatch({ type: 'CLEAR_TOAST' })}>
      {toast.message}
    </div>
  );
}

function AppContent() {
  const { view } = useAppState();

  return (
    <div className="app-layout">
      <SideNav />
      <div className="main-content">
        <TopNav />

        {view === 'dashboard' && <Dashboard />}

        {view === 'workspace' && (
          <main className="workspace">
            <ToolSidebar />
            <PDFViewer />
            <DetectionPanel />
          </main>
        )}

        {view === 'processing' && <ProcessingView />}
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
