import { createServer } from 'node:http'

/** @brief Send a JSON response with the supplied HTTP status. */
function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(data))
}

/** @brief Read a bounded JSON request body. @param request Incoming HTTP request. */
async function readJson(request) {
  let body = ''
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 65536) throw Object.assign(new Error('Request body exceeds 64 KB.'), { status: 413 })
    body += chunk.toString()
  }
  try {
    return JSON.parse(body)
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })
  }
}

/**
 * @brief Create an independent HTTP application without starting a listener.
 * @param options Configuration and optional application request handler.
 * @param options.allowedOrigins Exact browser origins allowed to access this API.
 * @param options.generate Async model adapter receiving a prompt and returning response text.
 * @returns A Node HTTP server that callers can listen on or close.
 */
export function createApp({
  allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'],
  generate = async () => { throw Object.assign(new Error('LLM service is not configured yet.'), { status: 503 }) },
} = {}) {
  return createServer(async (request, response) => {
    const origin = request.headers.origin
    response.setHeader('Vary', 'Origin')
    if (origin && !allowedOrigins.includes(origin)) {
      sendJson(response, 403, { success: false, message: 'Origin is not allowed.' })
      return
    }
    if (origin) response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }
    const path = new URL(request.url, 'http://localhost').pathname
    try {
      if (request.method === 'GET' && path === '/api/health') {
        sendJson(response, 200, { success: true, status: 'ok' })
      } else if (request.method === 'POST' && path === '/api/generate') {
        if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
          sendJson(response, 415, { success: false, message: 'Use Content-Type: application/json.' })
          return
        }
        const data = await readJson(request)
        if (typeof data?.prompt !== 'string' || !data.prompt.trim()) {
          sendJson(response, 400, { success: false, message: 'A non-empty prompt string is required.' })
          return
        }
        const controller = new AbortController()
        const onClose = () => { if (!response.writableEnded) controller.abort() }
        response.once('close', onClose)
        let text
        try {
          text = await generate(data.prompt.trim(), { signal: controller.signal })
        } finally {
          response.off('close', onClose)
        }
        if (controller.signal.aborted) return
        if (typeof text !== 'string') throw new Error('Model adapter must return response text.')
        sendJson(response, 200, { success: true, response: text })
      } else {
        sendJson(response, 404, { success: false, message: 'Endpoint not found.' })
      }
    } catch (error) {
      const status = error.status === 400 || error.status === 413 || error.status === 503 ? error.status : 500
      sendJson(response, status, { success: false, message: status === 500 ? 'Internal server error.' : error.message })
    }
  })
}


