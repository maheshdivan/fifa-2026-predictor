import type { QuizQuestion, UserOverrides } from '../types'

// In production, VITE_API_URL is set to the backend URL (e.g. https://fifa-api.onrender.com/api).
// In local dev, the Vite proxy forwards /api → localhost:8000/api so no env var is needed.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export async function fetchQuiz(): Promise<QuizQuestion[]> {
  const res = await fetch(`${BASE}/quiz`)
  if (!res.ok) throw new Error(`Quiz fetch failed: ${res.statusText}`)
  const data = await res.json()
  return data.questions as QuizQuestion[]
}

type ProgressHandler = (event: { step: string; message: string; progress: number; wc_data?: unknown }) => void
type CompleteHandler = (data: { predictions: unknown; wc_data: unknown }) => void
type ErrorHandler = (msg: string) => void

export function streamPredictions(
  wikiUrl: string,
  onProgress: ProgressHandler,
  onComplete: CompleteHandler,
  onError: ErrorHandler
): () => void {
  const url = `${BASE}/predict/stream?wiki_url=${encodeURIComponent(wikiUrl)}`
  return _openEventSource(url, onProgress, onComplete, onError)
}

export function streamOverridePredictions(
  wikiUrl: string,
  overrides: UserOverrides,
  onProgress: ProgressHandler,
  onComplete: CompleteHandler,
  onError: ErrorHandler
): () => void {
  const url =
    `${BASE}/predict/stream?wiki_url=${encodeURIComponent(wikiUrl)}` +
    `&overrides=${encodeURIComponent(JSON.stringify(overrides))}`
  return _openEventSource(url, onProgress, onComplete, onError)
}

function _openEventSource(
  url: string,
  onProgress: ProgressHandler,
  onComplete: CompleteHandler,
  onError: ErrorHandler
): () => void {
  const es = new EventSource(url)

  es.addEventListener('progress', (e: MessageEvent) => {
    try { onProgress(JSON.parse(e.data)) } catch { /* ignore */ }
  })

  es.addEventListener('complete', (e: MessageEvent) => {
    es.close()
    try {
      onComplete(JSON.parse(e.data))
    } catch {
      onError('Failed to parse prediction results')
    }
  })

  es.addEventListener('error', (e: MessageEvent) => {
    es.close()
    try {
      const data = JSON.parse(e.data)
      onError(data.message || 'Unknown error')
    } catch {
      onError('Stream connection error')
    }
  })

  es.onerror = () => {
    es.close()
    onError('Lost connection to prediction server')
  }

  return () => es.close()
}
