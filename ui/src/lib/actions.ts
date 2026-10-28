import { toast } from 'sonner'
import type { PublicationEntry } from './allowlist'
import { publications } from './allowlist'
import { api } from './api'
import { trackJob } from './jobs'

const fail = (title: string) => (e: unknown) => {
  toast.error(title, { description: e instanceof Error ? e.message : String(e) })
  throw e
}

/** POST /publications: backfill one allowlisted feed. */
export async function startBackfill(pub: PublicationEntry) {
  const res = await api.addPublication(pub.feed_url, pub.name).catch(fail(`Backfill of ${pub.name} failed`))
  trackJob({
    event_id: res.event_id,
    kind: 'backfill',
    label: pub.name,
    trace_url: res.trace_url,
    created_at: Date.now(),
  })
  toast.success(`Backfill queued · ${pub.name}`, { description: `event ${res.event_id}` })
  return res
}

/** One POST /publications per allowlisted feed, which is what kb_backfill("all") does. */
export async function startBackfillAll() {
  const results = await Promise.allSettled(publications.map((p) => startBackfill(p)))
  return results.filter((r) => r.status === 'fulfilled').length
}

/** POST /articles: ingest one URL ahead of any queued backfill. */
export async function ingestArticle(url: string, title?: string) {
  const res = await api.addArticle(url, title).catch(fail('Article was not queued'))
  trackJob({
    event_id: res.event_id,
    kind: 'article',
    label: title || url,
    trace_url: res.trace_url,
    created_at: Date.now(),
    priority_offset_s: res.priority_offset_s,
  })
  toast.success('Article queued', {
    description: `priority +${res.priority_offset_s ?? 0}s ahead of backfills`,
  })
  return res
}

/**
 * There's no HTTP endpoint for a freshness poll (only the MCP tool `kb_sync`),
 * so this sends the same `kb/feed.poll` event straight to the Inngest dev server.
 */
export async function syncNow() {
  // poll-feeds always walks every allowlisted feed, so there's nothing to filter on.
  const res = await api
    .sendEvent('kb/feed.poll')
    .catch(fail('Could not trigger a freshness poll'))
  const eventId = res.ids?.[0]
  if (!eventId) throw new Error('Inngest did not return an event id')
  trackJob({
    event_id: eventId,
    kind: 'sync',
    label: 'Freshness poll · all feeds',
    trace_url: `${__INNGEST_URL__}/event/${eventId}`,
    created_at: Date.now(),
  })
  toast.success('Freshness poll triggered', { description: 'Conditional GET against every feed' })
  return eventId
}

/** POST /evals/run: the multi-variant benchmark plus a replay of recent `failures` rows. */
export async function runEvalSuite(suite_name = 'golden_v1', include_failures_table = true) {
  const res = await api
    .runEvals(suite_name, include_failures_table)
    .catch(fail('Evaluation suite was not queued'))
  trackJob({
    event_id: res.event_id,
    kind: 'eval',
    label: `Eval suite · ${res.suite_name}`,
    trace_url: res.trace_url,
    created_at: Date.now(),
  })
  toast.success(`Eval suite queued · ${res.suite_name}`, { description: `event ${res.event_id}` })
  return res
}
