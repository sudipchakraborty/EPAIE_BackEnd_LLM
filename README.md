# EPAIE LLM Backend

Minimal, dependency-free Node.js API. Requires Node.js 22 or newer.

## Run

- `npm start`: start at http://127.0.0.1:3002.
- `npm run dev`: restart on source changes.
- `npm test`: run HTTP integration checks.

No npm install is needed. Copy `.env.example` to `.env` to override HOST, PORT or FRONTEND_ORIGIN (comma-separated exact origins). Default browser origins are http://localhost:5173 and http://127.0.0.1:5173. Port 3002 is separate from the DB backend's port 3001.

## Endpoints

- `GET /api/health`: service health.
- `POST /api/generate`: JSON `{ "prompt": "Your question" }`; success returns `{ "success": true, "response": "Model output" }`.

The API returns HTTP 503 until a model adapter is configured. No model, inference provider, database or authentication is included yet. Frontend wiring is unchanged.

## Add a model later

`src/app.js` exports `createApp({ allowedOrigins, generate })`. Supply an async `generate(prompt)` function returning a string. Configure that adapter in `src/server.js` when ready. The application module does not start a listener, so it can be reused and tested independently. Source interfaces include Doxygen-style comments.

Frontend request example:

```js
const result = await fetch('http://127.0.0.1:3002/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello' }),
})
const data = await result.json()
if (!result.ok) throw new Error(data.message)
console.log(data.response)
```
