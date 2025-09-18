# Snapyfit Inbox Service

Full-stack service to accept text via POST and review in a mobile-first UI with Accept (forward POST) / Cancel. Dockerized (backend + frontend + n8n).

## Endpoints (backend)
- POST /ingest { text }
- GET /items
- POST /accept/:id (forwards to FORWARD_URL)
- POST /cancel/:id
- GET /events (SSE)
- WS /ws (WebSocket)

### WebSocket
- Connect to: `ws://localhost:4000/ws`
- On connect, server sends: `{ type: "init", payload: Message[] }`
- Broadcast events:
  - `{ type: "created", payload: Message }`
  - `{ type: "accepted", payload: { id, text } }`
  - `{ type: "cancelled", payload: { id } }`

Where `Message` is:
```json
{
  "id": "string",
  "text": "string",
  "status": "pending" | "accepted" | "cancelled",
  "createdAt": "ISO date",
  "acceptedAt?": "ISO date",
  "cancelledAt?": "ISO date"
}
```

## Quick start (Docker)
1. Set env in `docker-compose.yml`:
   - FORWARD_URL: URL of the other server to forward accepted items (optional)
   - CORS_ORIGIN: frontend origin (e.g., http://localhost:5173)
2. Build and run all services (backend, frontend, n8n):

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- n8n: http://localhost:5678

### cURL examples
```bash
curl -X POST http://localhost:4000/ingest \
  -H 'Content-Type: application/json' \
  -d '{"text":"Пример текста"}'
```

## n8n integration tips
- Use HTTP Request node to POST to `http://backend:4000/ingest` from within n8n container.
- If you expose endpoints externally via ngrok, update CORS and frontend `VITE_API_BASE` accordingly.
