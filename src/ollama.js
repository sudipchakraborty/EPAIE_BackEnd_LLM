/** @brief Create a reusable Ollama chat adapter with configurable model and endpoint. */
export function createOllamaGenerator({
  baseUrl = 'http://127.0.0.1:11434', model = 'qwen3:4b', timeoutMs = 120000,
  fetchImpl = fetch,
} = {}) {
  return async (prompt, { signal } = {}) => {
    try {
      const timeout = AbortSignal.timeout(timeoutMs)
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false, think: false }),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
      if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}. Check the configured model and service.`)
      const result = await response.json()
      if (typeof result.message?.content !== 'string' || !result.message.content.trim()) {
        throw new Error('Ollama returned an empty or invalid response.')
      }
      return result.message.content
    } catch (error) {
      if (signal?.aborted) throw error
      throw Object.assign(new Error(error.name === 'TimeoutError'
        ? 'The model took too long to respond. Please try again.'
        : `Unable to generate a response. ${error.message}`), { status: 503 })
    }
  }
}
