import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

/** @brief Start an isolated API for HTTP integration checks. */
async function start(t, options) {
  const server = createApp(options)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  return `http://127.0.0.1:${server.address().port}`
}
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('health and unconfigured LLM status', async (t) => {
  const base = await start(t)
  assert.equal((await fetch(`${base}/api/health`)).status, 200)
  const result = await fetch(`${base}/api/generate`, json({ prompt: 'Hello' }))
  assert.equal(result.status, 503)
  assert.equal((await result.json()).success, false)
})

test('injected model, input validation and CORS', async (t) => {
  const base = await start(t, { generate: async (prompt) => `Reply: ${prompt}` })
  const result = await fetch(`${base}/api/generate`, json({ prompt: ' Hello ' }))
  assert.deepEqual(await result.json(), { success: true, response: 'Reply: Hello' })
  for (const data of [null, {}, { prompt: '' }, { prompt: 5 }]) {
    assert.equal((await fetch(`${base}/api/generate`, json(data))).status, 400)
  }
  assert.equal((await fetch(`${base}/api/generate`, { ...json({}), body: '{' })).status, 400)
  assert.equal((await fetch(`${base}/api/generate`, { method: 'POST', body: 'text' })).status, 415)
  assert.equal((await fetch(`${base}/missing`)).status, 404)
  assert.equal((await fetch(`${base}/api/health`, { headers: { Origin: 'https://example.com' } })).status, 403)
  const preflight = await fetch(`${base}/api/generate`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173')
})
