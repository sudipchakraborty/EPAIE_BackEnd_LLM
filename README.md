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

Startup configures the local Ollama adapter automatically. Ollama must be running with the configured model available; provider failures return HTTP 503. Creating the application without a generation adapter also returns HTTP 503. Database access and authentication belong to the separate DB backend and are not implemented here.

## Inject a different model adapter

`src/app.js` exports `createApp({ allowedOrigins, generate })`. Supply an async `generate(prompt, { signal })` function returning a string and use the signal to cancel upstream work when the client disconnects. Configure a replacement adapter in `src/server.js`; the default startup already injects Ollama. The application module does not start a listener, so it can be reused and tested independently. Source interfaces include Doxygen-style comments.

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

## Ollama connection (2026-10-30)

Startup now injects the Ollama adapter automatically. Defaults: OLLAMA_BASE_URL=http://127.0.0.1:11434 and OLLAMA_MODEL=qwen3:4b. Override these in .env. Ollama must be running with that model available on the backend machine. /api/generate forwards the prompt to /api/chat with stream:false and think:false, and returns message.content. Requests time out after 120 seconds; browser disconnects cancel the upstream fetch. Start this backend with npm start and the frontend with npm run dev in their respective folders. The frontend endpoint is configurable in src/config.json under llm.endpoint.
