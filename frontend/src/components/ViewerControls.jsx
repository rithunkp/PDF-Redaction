import { useAppState, useAppDispatch } from '../context/AppContext';
import * as api from '../api';

export default function ViewerControls() {
  const { currentPage, pageCount, zoom, sessionId } = useAppState();
  const dispatch = useAppDispatch();

  const goToPage = async (page) => {
    if (page < 1 || page > pageCount || !sessionId) return;
    dispatch({ type: 'SET_LOADING', key: 'isLoadingPage', value: true });
    try {
      const data = await api.getPage(sessionId, page);
      dispatch({
        type: 'SET_PAGE_IMAGE',
        image: data.image_base64,
        width: data.width,
        height: data.height,
        pageNumber: page,
      });
    } catch (e) {
      dispatch({ type: 'SET_LOADING', key: 'isLoadingPage', value: false });
      dispatch({ type: 'SET_TOAST', toast: { type: 'error', message: e.message } });
    }
  };

  const changeZoom = (delta) => {
    const newZoom = Math.max(0.25, Math.min(3, zoom + delta));
    dispatch({ type: 'SET_ZOOM', zoom: newZoom });
  };

  return (
    <div className="viewer-controls glass-panel">
      <div className="zoom-group">
        <button onClick={() => changeZoom(-0.25)} title="Zoom Out">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>remove</span>
        </button>
        <span className="label">{Math.round(zoom * 100)}%</span>
        <button onClick={() => changeZoom(0.25)} title="Zoom In">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        </button>
      </div>

      <div className="divider" />

      <div className="page-group">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
        </button>
        <span className="label">Page {currentPage} of {pageCount}</span>
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
      </div>
    </div>
  );
}
