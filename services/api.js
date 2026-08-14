/** Thin client for the built-in Next.js API routes. */

const BASE = process.env.NEXT_PUBLIC_API_URL || '';

/** Thrown for non-2xx responses so callers can inspect `data` and `status`. */
export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    throw new ApiError(`Unexpected response from ${path} (HTTP ${res.status})`, { status: res.status });
  }

  if (!res.ok || payload?.success === false) {
    throw new ApiError(payload?.error || `Request failed (HTTP ${res.status})`, {
      status: res.status,
      data: payload?.data,
    });
  }
  return payload;
}

export async function fetchHealth() {
  const { data } = await request('/api/health');
  return data;
}

export async function fetchProjects(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const payload = await request(`/api/projects${query ? `?${query}` : ''}`);
  return { items: payload.data || [], meta: payload.meta || {} };
}

export async function fetchProject(id) {
  const { data } = await request(`/api/projects/${id}`);
  return data;
}

export async function fetchManifest(id, chip) {
  const query = chip ? `?chip=${encodeURIComponent(chip)}` : '';
  const { data } = await request(`/api/projects/${id}/manifest${query}`);
  return data;
}

export async function fetchCompatibility(id, chip) {
  const { data } = await request(`/api/projects/${id}/compatibility?chip=${encodeURIComponent(chip)}`);
  return data;
}

/* ── Admin ──────────────────────────────────────────────────────────── */

export async function adminLoginConfig() {
  const { data } = await request('/api/admin/login');
  return data;
}

export async function adminLogin(username, password, totp) {
  const { data } = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, totp }),
  });
  return data;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

export async function adminListProjects(token) {
  const { data } = await request('/api/admin/projects', { headers: auth(token) });
  return data;
}

export async function adminSaveProject(token, project) {
  const { data } = await request('/api/admin/projects', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify(project),
  });
  return data;
}

export async function adminUpdateProject(token, id, patch) {
  const { data } = await request(`/api/admin/projects/${id}`, {
    method: 'PATCH',
    headers: auth(token),
    body: JSON.stringify(patch),
  });
  return data;
}

export async function adminDeleteProject(token, id) {
  const { data } = await request(`/api/admin/projects/${id}`, {
    method: 'DELETE',
    headers: auth(token),
  });
  return data;
}

/* ── Per-file firmware management ───────────────────────────────────── */

export async function adminAddFiles(token, id, payload) {
  const { data } = await request(`/api/admin/projects/${id}/files`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify(payload),
  });
  return data;
}

export async function adminSetFileOffset(token, id, filename, offset) {
  const { data } = await request(`/api/admin/projects/${id}/files`, {
    method: 'PATCH',
    headers: auth(token),
    body: JSON.stringify({ filename, offset }),
  });
  return data;
}

export async function adminDeleteFile(token, id, filename) {
  const { data } = await request(
    `/api/admin/projects/${id}/files?filename=${encodeURIComponent(filename)}`,
    { method: 'DELETE', headers: auth(token) }
  );
  return data;
}

/* ── Session + audit ────────────────────────────────────────────────── */

export async function adminSession(token) {
  const { data } = await request('/api/admin/session', { headers: auth(token) });
  return data;
}

export async function adminRevokeSessions(token) {
  const { data } = await request('/api/admin/session', {
    method: 'DELETE',
    headers: auth(token),
  });
  return data;
}

export async function adminAudit(token) {
  const { data } = await request('/api/admin/audit', { headers: auth(token) });
  return data;
}
