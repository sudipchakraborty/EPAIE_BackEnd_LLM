import test from 'node:test'
import assert from 'node:assert/strict'
import { createOllamaGenerator } from '../src/ollama.js'
import { createApp } from '../src/app.js'

test('HTTP prompt reaches Ollama adapter and response returns to caller', async (t) => {
  const generate = createOllamaGenerator({ fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat')
    const body = JSON.parse(options.body)
    assert.equal(body.model, 'qwen3:4b')
    assert.equal(body.messages[0].content, 'Hello')
    assert.equal(body.stream, false)
    return Response.json({ message: { content: 'Hello from model' } })
  } })
  const server = createApp({ generate })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Hello' }),
  })
  assert.deepEqual(await response.json(), { success: true, response: 'Hello from model' })
})
test('adapter reports model errors and invalid responses', async () => {
  for (const reply of [new Response('', { status: 404 }), Response.json({ message: {} })]) {
    await assert.rejects(createOllamaGenerator({ fetchImpl: async () => reply })('Hello'), { status: 503 })
  }
})
