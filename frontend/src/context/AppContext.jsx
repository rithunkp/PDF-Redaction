import { createContext, useContext, useReducer } from 'react';

const AppContext = createContext(null);
const DispatchContext = createContext(null);

const initialState = {
  // View: 'dashboard' | 'workspace' | 'processing'
  view: 'dashboard',

  // Session
  sessionId: null,
  filename: null,
  pageCount: 0,

  // Viewer
  currentPage: 1,
  zoom: 1.0,
  pageImage: null,       // base64 string
  pageDimensions: null,  // { width, height } in PDF points
  scaleX: 1,
  scaleY: 1,

  // Redactions
  redactions: [],
  detectedMatches: [],
  selectedMatchIds: new Set(),

  // Drawing
  drawingMode: false,
  activeTool: 'select',  // 'select' | 'area' | 'manual'

  // Loading states
  isUploading: false,
  isLoadingPage: false,
  isDetecting: false,
  isExporting: false,

  // Errors / toasts
  toast: null, // { type: 'error'|'success', message: string }
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_SESSION':
      return {
        ...state,
        sessionId: action.sessionId,
        filename: action.filename,
        pageCount: action.pageCount,
        currentPage: 1,
        redactions: [],
        detectedMatches: [],
        selectedMatchIds: new Set(),
        view: 'workspace',
      };

    case 'SET_PAGE_IMAGE':
      return {
        ...state,
        pageImage: action.image,
        pageDimensions: { width: action.width, height: action.height },
        currentPage: action.pageNumber,
        isLoadingPage: false,
      };

    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.page };

    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };

    case 'SET_SCALE':
      return { ...state, scaleX: action.scaleX, scaleY: action.scaleY };

    case 'SET_REDACTIONS':
      return { ...state, redactions: action.redactions };

    case 'ADD_REDACTION':
      return { ...state, redactions: [...state.redactions, action.redaction] };

    case 'REMOVE_REDACTION':
      return {
        ...state,
        redactions: state.redactions.filter(r => r.id !== action.id),
      };

    case 'SET_DETECTED_MATCHES':
      return {
        ...state,
        detectedMatches: action.matches,
        selectedMatchIds: new Set(action.matches.map(m => m.id)),
        isDetecting: false,
      };

    case 'TOGGLE_MATCH':
      const newSet = new Set(state.selectedMatchIds);
      if (newSet.has(action.id)) newSet.delete(action.id);
      else newSet.add(action.id);
      return { ...state, selectedMatchIds: newSet };

    case 'CLEAR_MATCHES':
      return { ...state, detectedMatches: [], selectedMatchIds: new Set() };

    case 'SET_ACTIVE_TOOL':
      return {
        ...state,
        activeTool: action.tool,
        drawingMode: action.tool === 'area' || action.tool === 'manual',
      };

    case 'SET_LOADING':
      return { ...state, [action.key]: action.value };

    case 'SET_TOAST':
      return { ...state, toast: action.toast };

    case 'CLEAR_TOAST':
      return { ...state, toast: null };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
