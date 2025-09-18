const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export const api = {
  list: () => fetch(`${API_BASE}/items`).then(r=>r.json()),
  ingest: (text) => fetch(`${API_BASE}/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).then(r=>r.json()),
  accept: (id) => fetch(`${API_BASE}/accept/${id}`, { method: 'POST' }).then(r=>r.json()),
  cancel: (id) => fetch(`${API_BASE}/cancel/${id}`, { method: 'POST' }).then(r=>r.json()),
  eventsUrl: () => `${API_BASE}/events`,
}
