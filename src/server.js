import { createApp } from './app.js'
import { createOllamaGenerator } from './ollama.js'

/** @brief Configure and start the local API using environment parameters. */
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3002)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.')
}
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : undefined
const generate = createOllamaGenerator({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  model: process.env.OLLAMA_MODEL || 'qwen3:4b',
})
const server = createApp({ allowedOrigins, generate })
server.on('error', (error) => {
  console.error(`API failed to start: ${error.message}`)
  process.exitCode = 1
})
server.listen(port, host, () => console.log(`EPAIE LLM API listening at http://${host}:${port}`))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close())
}


