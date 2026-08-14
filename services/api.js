/** Thin client for the built-in Next.js API routes. */

const BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
    throw new Error(`Unexpected response from ${path} (HTTP ${res.status})`);
  }

  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.error || `Request failed (HTTP ${res.status})`);
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

export async function adminLogin(username, password) {
  const { data } = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
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

export async function adminDeleteProject(token, id) {
  const { data } = await request(`/api/admin/projects/${id}`, {
    method: 'DELETE',
    headers: auth(token),
  });
  return data;
}
