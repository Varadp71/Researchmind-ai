/**
 * ResearchMind AI - Enhanced API Client
 * Graceful error handling — UI never crashes if backend is down
 */

const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };

  if (!headers['Authorization']) {
    headers['Authorization'] = 'Bearer demo-token';
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const err = await response.json();
        detail = err.detail || JSON.stringify(err);
      } catch (_) {}
      throw new ApiError(detail, response.status);
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network error — backend likely down
    throw new ApiError(
      'Cannot connect to backend. Make sure the server is running on port 8000.',
      0
    );
  }
}

// ──────────── Health ────────────
export async function checkHealth() {
  return request('/health');
}

// ──────────── Projects ────────────
export async function getProjects() {
  const res = await request('/projects');
  return res.projects || [];
}

export async function createProject(data) {
  return request('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getProject(projectId) {
  return request(`/projects/${projectId}`);
}

export async function deleteProject(projectId) {
  return request(`/projects/${projectId}`, { method: 'DELETE' });
}

// ──────────── Papers ────────────
export async function getPapers(projectId) {
  const res = await request(`/papers/${projectId}`);
  return res.papers || [];
}

export async function getPaper(projectId, paperId) {
  return request(`/papers/${projectId}/${paperId}`);
}

export async function uploadPaper(projectId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/papers/${projectId}/upload`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer demo-token' },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Upload failed', res.status);
  }
  return res.json();
}

export async function deletePaper(projectId, paperId) {
  return request(`/papers/${projectId}/${paperId}`, { method: 'DELETE' });
}

export async function reprocessPaper(projectId, paperId) {
  return request(`/papers/${projectId}/${paperId}/reprocess`, { method: 'POST' });
}

export async function seedSamples(projectId) {
  return request(`/papers/${projectId}/seed-samples`, { method: 'POST' });
}

// ──────────── Analysis ────────────
export async function startAnalysis(projectId) {
  return request(`/analysis/${projectId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis_type: 'full' }),
  });
}

export async function getAnalysisStatus(projectId) {
  return request(`/analysis/${projectId}/status`);
}

export async function getAnalysisResults(projectId) {
  return request(`/analysis/${projectId}/results`);
}

export async function getDashboard(projectId) {
  return request(`/analysis/${projectId}/dashboard`);
}

export { ApiError };
