/**
 * Lightweight structured logger.
 *
 * Always logs to the browser console. Additionally, when `VITE_SEQ_URL` is set
 * (e.g. http://localhost:5341), it ships events to a local Seq instance in CLEF
 * (Compact Log Event Format). Shipping to Seq is best-effort, fire-and-forget,
 * and never throws back into the app.
 *
 * Note: Seq must allow cross-origin ingestion from the dev origin
 * (http://localhost:5173). Configure this in Seq via the `SEQ_INGESTION_CORS`
 * setting / Settings → API if requests are blocked by CORS.
 */

const SEQ_URL = import.meta.env.VITE_SEQ_URL?.replace(/\/$/, '')
const SEQ_API_KEY = import.meta.env.VITE_SEQ_API_KEY

type Level = 'Information' | 'Warning' | 'Error'
type Properties = Record<string, unknown>

function shipToSeq(level: Level, messageTemplate: string, properties: Properties, error?: unknown) {
  if (!SEQ_URL) return

  const event: Record<string, unknown> = {
    '@t': new Date().toISOString(),
    '@l': level,
    '@mt': messageTemplate,
    app: 'bank-of-mum-and-dad',
    ...properties,
  }
  if (error instanceof Error) {
    event['@x'] = error.stack ?? `${error.name}: ${error.message}`
  } else if (error !== undefined) {
    event['@x'] = String(error)
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/vnd.serilog.clef' }
  if (SEQ_API_KEY) headers['X-Seq-ApiKey'] = SEQ_API_KEY

  void fetch(`${SEQ_URL}/ingest/clef`, {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // Swallow transport/CORS errors — logging must never break the app.
  })
}

export function logError(messageTemplate: string, error?: unknown, properties: Properties = {}) {
  console.error(messageTemplate, error ?? '', properties)
  shipToSeq('Error', messageTemplate, properties, error)
}

export function logWarning(messageTemplate: string, properties: Properties = {}) {
  console.warn(messageTemplate, properties)
  shipToSeq('Warning', messageTemplate, properties)
}

export function logInfo(messageTemplate: string, properties: Properties = {}) {
  console.info(messageTemplate, properties)
  shipToSeq('Information', messageTemplate, properties)
}
