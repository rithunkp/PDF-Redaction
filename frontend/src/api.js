/**
 * API client — fetch wrapper for all backend endpoints.
 */

const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, options);
  if (options.raw) return res; // for file downloads
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  return data.data;
}

// ─── PDF ───

export async function uploadPDF(file) {
  const form = new FormData();
  form.append('file', file);
  return request('/pdf/upload', { method: 'POST', body: form });
}

export async function getPage(sessionId, pageNumber) {
  return request(`/pdf/${sessionId}/page/${pageNumber}`);
}

export async function getTextLayer(sessionId, pageNumber) {
  return request(`/pdf/${sessionId}/text-layer/${pageNumber}`);
}

export async function exportPDF(sessionId, flatten = true) {
  const res = await fetch(`${BASE}/pdf/${sessionId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flatten }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Export failed');
  }
  return res; // caller will handle blob download
}

// ─── Redactions ───

export async function getRedactions(sessionId) {
  return request(`/redactions/${sessionId}`);
}

export async function addRedaction(sessionId, page, bbox, label, source = 'manual') {
  return request(`/redactions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page, bbox, label, source }),
  });
}

export async function deleteRedaction(sessionId, redactionId) {
  return request(`/redactions/${sessionId}/${redactionId}`, {
    method: 'DELETE',
  });
}

export async function clearRedactions(sessionId, page = null) {
  return request(`/redactions/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(page ? { page } : {}),
  });
}

// ─── Detection ───

export async function detect(sessionId, page, patterns, useNlp = false) {
  return request(`/detect/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page, patterns, use_nlp: useNlp }),
  });
}

export async function applyDetected(sessionId, matchIds) {
  return request(`/detect/${sessionId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ match_ids: matchIds }),
  });
}
