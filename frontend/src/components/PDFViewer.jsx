import { useRef, useState, useCallback, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import * as api from '../api';
import ViewerControls from './ViewerControls';

export default function PDFViewer() {
  const {
    pageImage, pageDimensions, currentPage, zoom,
    redactions, detectedMatches, selectedMatchIds,
    drawingMode, sessionId, isLoadingPage, scaleX, scaleY,
  } = useAppState();
  const dispatch = useAppDispatch();

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [drawing, setDrawing] = useState(null); // { x0, y0, x1, y1 } in pixels

  // Update scale when image loads or resizes
  const updateScale = useCallback(() => {
    if (!imgRef.current || !pageDimensions) return;
    const imgW = imgRef.current.clientWidth;
    const imgH = imgRef.current.clientHeight;
    dispatch({
      type: 'SET_SCALE',
      scaleX: imgW / pageDimensions.width,
      scaleY: imgH / pageDimensions.height,
    });
  }, [pageDimensions, dispatch]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale, pageImage]);

  // ─── Drawing handlers ───
  const onMouseDown = (e) => {
    if (!drawingMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDrawing({
      x0: e.clientX - rect.left,
      y0: e.clientY - rect.top,
      x1: e.clientX - rect.left,
      y1: e.clientY - rect.top,
    });
  };

  const onMouseMove = (e) => {
    if (!drawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDrawing(prev => ({
      ...prev,
      x1: e.clientX - rect.left,
      y1: e.clientY - rect.top,
    }));
  };

  const onMouseUp = async () => {
    if (!drawing || !sessionId) {
      setDrawing(null);
      return;
    }

    const w = Math.abs(drawing.x1 - drawing.x0);
    const h = Math.abs(drawing.y1 - drawing.y0);

    // Discard tiny clicks
    if (w < 10 || h < 10) {
      setDrawing(null);
      return;
    }

    // Convert pixels → PDF points
    const x0 = Math.min(drawing.x0, drawing.x1) / scaleX;
    const y0 = Math.min(drawing.y0, drawing.y1) / scaleY;
    const x1 = Math.max(drawing.x0, drawing.x1) / scaleX;
    const y1 = Math.max(drawing.y0, drawing.y1) / scaleY;

    setDrawing(null);

    try {
      const data = await api.addRedaction(sessionId, currentPage, [x0, y0, x1, y1]);
      dispatch({ type: 'ADD_REDACTION', redaction: data.redaction });
    } catch (e) {
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    }
  };

  // ─── Delete redaction ───
  const handleDelete = async (id) => {
    try {
      await api.deleteRedaction(sessionId, id);
      dispatch({ type: 'REMOVE_REDACTION', id });
    } catch (e) {
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    }
  };

  // Filter redactions for current page
  const pageRedactions = redactions.filter(r => r.page === currentPage);
  const pageDetected = detectedMatches.filter(m => m.page === currentPage && selectedMatchIds.has(m.id));

  if (!pageImage) {
    return (
      <div className="pdf-viewer" style={{ alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, opacity: 0.3 }}>
            description
          </span>
          <p style={{ marginTop: '1rem' }}>Upload a PDF to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer ${drawingMode ? 'crosshair' : ''}`}>
      {isLoadingPage && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(13,14,17,0.7)', zIndex: 5,
        }}>
          <span className="material-symbols-outlined loading-spinner" style={{ fontSize: 32, color: 'var(--primary)' }}>
            refresh
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="pdf-page-container"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => drawing && setDrawing(null)}
      >
        <img
          ref={imgRef}
          src={`data:image/png;base64,${pageImage}`}
          alt={`Page ${currentPage}`}
          draggable={false}
          onLoad={updateScale}
          style={{ userSelect: 'none' }}
        />

        {/* Confirmed redaction overlays */}
        {pageRedactions.map(r => (
          <div
            key={r.id}
            className="redaction-overlay pending"
            style={{
              left: r.bbox[0] * scaleX,
              top: r.bbox[1] * scaleY,
              width: (r.bbox[2] - r.bbox[0]) * scaleX,
              height: (r.bbox[3] - r.bbox[1]) * scaleY,
            }}
          >
            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>×</button>
          </div>
        ))}



        {/* Drawing preview */}
        {drawing && (
          <div
            className="drawing-rect"
            style={{
              left: Math.min(drawing.x0, drawing.x1),
              top: Math.min(drawing.y0, drawing.y1),
              width: Math.abs(drawing.x1 - drawing.x0),
              height: Math.abs(drawing.y1 - drawing.y0),
            }}
          />
        )}
      </div>

      <ViewerControls />
    </div>
  );
}
