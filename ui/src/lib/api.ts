import { createStore } from './store'

/* ------------------------------------------------------------------ types -- */
/* Shapes as returned by kb/main.py (through week 5). Nothing here is invented: where the
 * UI needs more (passage text for citations, engine-agnostic hits) it derives
 * it client-side from the existing endpoints. */

export interface Health {
  status: 'ok' | 'degraded'
  database: string
  inngest: string
  /** Week 4. Optional so an older backend still renders. */
  memgraph?: string
  articles: number
  passages: number
  /** Active claims (max of Postgres and Memgraph) and canonical topics in the graph. */
  claims?: number
  topics?: number
}

export type Mode = 'hybrid' | 'sparse' | 'dense'
/** `source` on a hybrid candidate: which of the three engines found it (kb/retrieval/hybrid.py). */
export type Engine = 'bm25' | 'vector' | 'both' | 'graph' | 'bm25+graph' | 'vector+graph' | 'all'
export type ClaimType = 'opinion' | 'measurement' | 'prediction'

/** Set when the Memgraph claim graph matched the passage (week 4). */
interface ClaimFields {
  claim_id?: string | null
  claim_text?: string | null
  claim_type?: ClaimType | string | null
}

interface PassageBase {
  passage_id: string
  text: string
  title: string
  author: string | null
  url: string
  published_at: string
}

/** `GET /search?mode=sparse|dense`: one engine, `rank` is ts_rank or cosine similarity. */
export interface EngineResult extends PassageBase {
  rank: number
}

/** `GET /search?mode=hybrid` and the candidates inside POST /ask: 3-way RRF since week 4. */
export interface HybridResult extends PassageBase, ClaimFields {
  rrf_score: number
  sparse_rank: number | null
  sparse_score: number | null
  dense_rank: number | null
  dense_score: number | null
  /** Absent on a pre-week-4 backend. */
  graph_rank?: number | null
  source: Engine
}

export interface SearchResponse {
  mode: Mode
  results: (EngineResult | HybridResult)[]
}

/** One search hit, normalised so every mode renders the same way. */
export interface Hit extends PassageBase, ClaimFields {
  position: number
  score: number
  engine: Engine
  sparse_rank: number | null
  dense_rank: number | null
  graph_rank: number | null
  sparse_score: number | null
  dense_score: number | null
  rrf_score: number | null
}

export interface Citation {
  citation_idx: number
  passage_id: string
  title: string
  author: string | null
  url: string
  /** Present when the cited passage came with a graph claim. */
  claim_id?: string
  claim_type?: string | null
}

export interface AskResponse {
  answer: string
  citations: Citation[]
  as_of: string
  snapshot_id: string
  latency_ms: number
}

/** `GET /sources/{claim_or_passage_id}`: provenance for a citation (kb/db/queries.py). */
export interface SourceProvenance {
  kind: 'claim' | 'passage'
  id: string
  chunk_index?: number
  article: {
    article_id: string
    canonical_id: string
    title: string
    url: string
    published_at: string
    content_hash: string
  }
  publication: { slug: string; name: string; homepage: string }
  author: string
  /** The claim's quote_span, or the whole passage text. */
  verbatim_quote: string
  claim_text?: string
  claim_type?: string
  confidence?: number
  /** Canonical topics from the ontology (kb/graph/ontology.py). */
  topics?: { slug: string; name: string }[]
  validity: {
    valid_from: string
    valid_to: string | null
    is_active: boolean
    supersedes_id: string | null
  }
}

export interface Queued {
  event_id: string
  trace_url: string
  status: 'queued'
  priority_offset_s?: number
}

export interface JobStatus {
  status: string
  articles_done: number | null
  articles_total: number | null
  run_status: string | null
  failures: unknown[]
  trace_url: string
}

export interface InngestEvent {
  id: string
  internal_id?: string
  name: string
  data: Record<string, unknown>
  ts: number
  received_at?: string
}

export interface InngestRun {
  run_id: string
  function_id?: string
  status: string
  run_started_at?: string
  ended_at?: string | null
  output?: unknown
}

/* ---------------------------------------------------------------- evals -- */

export type Verdict = 'PASS' | 'FAIL'
/** The disagreement judge only runs when the retrieved context spans 2+ authors/publications. */
export type DisagreementVerdict = Verdict | 'NOT_APPLICABLE'

/** One row of `eval_results`, as `GET /evals/latest` returns it (no `checks`, no disagreement critique). */
export interface SnapshotEval {
  snapshot_id: string
  /** 1.0 all pass · 0.5 disagreement FAIL only · 0.0 deterministic or faithfulness FAIL. */
  composite_score: number
  deterministic_passed: boolean
  faithfulness_verdict: Verdict | string
  faithfulness_critique: string
  disagreement_verdict: DisagreementVerdict | string
  /** `FM-1`..`FM-6` from evals/taxonomy.yaml. */
  failure_codes: string[]
  created_at: string
}

/** Per-variant aggregate over evals/golden_benchmark.yaml (fixture corpus, not the live DB). */
export interface VariantSummary {
  recall_at_5: number
  mrr: number
  cross_pub_coverage: number
  /** Constants in kb/functions/evals.py, not measured per run. */
  deterministic_pass_rate: number
  faithfulness_pass_rate: number
}

export interface FailuresReplay {
  failures_replayed: number
  functions_affected: string[]
}

export interface EvalSuiteRun {
  run_id: string
  suite_name: string
  /** Keyed by variant (`sparse_bm25`, …) plus `failures_replay`. */
  variants_summary: Record<string, VariantSummary | FailuresReplay>
  created_at: string
}

/** `GET /evals/latest`. Pass rates cover only the `limit` most recent evaluations; null when there are none. */
export interface EvalReport {
  total_evaluated_snapshots: number
  recent_deterministic_pass_rate: number | null
  recent_faithfulness_pass_rate: number | null
  failure_taxonomy_counts: Record<string, number>
  recent_evaluations: SnapshotEval[]
  latest_suite_run: EvalSuiteRun | null
}

export interface EvalRunQueued extends Queued {
  suite_name: string
}

/* ------------------------------------------------------------- activity -- */

export type Target = 'api' | 'inngest'

export interface ActivityEntry {
  id: number
  target: Target
  method: string
  path: string
  at: number
  background: boolean
  request?: unknown
  status: number | null
  ms: number | null
  response?: unknown
  error?: string
}

/** Every request the UI makes, newest first, for the API console. */
export const activity = createStore<ActivityEntry[]>(null, [])

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

function detailOf(body: unknown, status: number, statusText: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (d && typeof d === 'object' && 'msg' in d ? String(d.msg) : String(d)))
        .join('; ')
    }
  }
  return statusText || `HTTP ${status}`
}

const BASE: Record<Target, string> = { api: '/api', inngest: '/inngest' }
const UNREACHABLE: Record<Target, string> = {
  api: 'Cannot reach the FastAPI app. Is `make start` running on :8000?',
  inngest: 'Cannot reach the Inngest dev server on :8288.',
}

let seq = 0

async function request<T>(
  target: Target,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  opts: { background?: boolean } = {},
): Promise<T> {
  const id = ++seq
  const started = performance.now()
  activity.set((prev) =>
    [
      { id, target, method, path, at: Date.now(), background: !!opts.background, request: body, status: null, ms: null },
      ...prev,
    ].slice(0, 150),
  )
  const patch = (p: Partial<ActivityEntry>) =>
    activity.set((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)))

  let res: Response
  try {
    res = await fetch(BASE[target] + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    patch({ ms: Math.round(performance.now() - started), error: UNREACHABLE[target] })
    throw new ApiError(0, UNREACHABLE[target])
  }

  const text = await res.text()
  const ms = Math.round(performance.now() - started)
  let data: unknown = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON body: keep the text */
  }
  patch({ status: res.status, ms, response: data })

  if (!res.ok) {
    // The Vite proxy answers 5xx with an empty body when the upstream is down.
    const message =
      res.status >= 500 && !text ? UNREACHABLE[target] : detailOf(data, res.status, res.statusText)
    patch({ error: message })
    throw new ApiError(res.status, message, data)
  }
  return data as T
}

/* ------------------------------------------------------------ endpoints -- */

export const api = {
  health: (background = true) => request<Health>('api', 'GET', '/health', undefined, { background }),

  search: (q: string, mode: Mode, limit: number) =>
    request<SearchResponse>(
      'api',
      'GET',
      `/search?${new URLSearchParams({ q, mode, limit: String(limit) })}`,
    ),

  ask: (question: string, limit?: number) =>
    request<AskResponse>('api', 'POST', '/ask', limit ? { question, limit } : { question }),

  source: (id: string) =>
    request<SourceProvenance>('api', 'GET', `/sources/${encodeURIComponent(id.trim())}`),

  addPublication: (feed_url: string, name?: string) =>
    request<Queued>('api', 'POST', '/publications', { feed_url, name }),

  addArticle: (url: string, title?: string) =>
    request<Queued>('api', 'POST', '/articles', { url, title: title || undefined }),

  /** `kb/eval.run` -> run-eval-suite. There is no jobs row, so `GET /jobs` falls back to the Inngest run. */
  runEvals: (suite_name?: string, include_failures_table?: boolean) =>
    request<EvalRunQueued>('api', 'POST', '/evals/run', { suite_name, include_failures_table }),

  evalReport: (limit = 10, background = true) =>
    request<EvalReport>('api', 'GET', `/evals/latest?limit=${limit}`, undefined, { background }),

  job: (eventId: string) =>
    request<JobStatus>('api', 'GET', `/jobs/${encodeURIComponent(eventId)}`, undefined, {
      background: true,
    }),

  /* Inngest dev server REST API (read-only, plus sending one event). */
  events: (limit = 30) =>
    request<{ data: InngestEvent[] }>('inngest', 'GET', `/v1/events?limit=${limit}`, undefined, {
      background: true,
    }),

  runs: (eventId: string) =>
    request<{ data: InngestRun[] }>(
      'inngest',
      'GET',
      `/v1/events/${encodeURIComponent(eventId)}/runs`,
      undefined,
      { background: true },
    ),

  /** Same event `kb_sync` sends; the dev server accepts any event key. */
  sendEvent: (name: string, data: Record<string, unknown> = {}) =>
    request<{ ids: string[]; status: number }>('inngest', 'POST', '/e/substack-brain-ui', {
      name,
      data,
    }),
}

/* -------------------------------------------------------- normalisation -- */

const isHybrid = (r: EngineResult | HybridResult): r is HybridResult => 'rrf_score' in r

export function toHits(mode: Mode, results: SearchResponse['results']): Hit[] {
  return results.map((r, i) => {
    const position = i + 1
    if (isHybrid(r)) {
      return { ...r, position, score: r.rrf_score, engine: r.source, graph_rank: r.graph_rank ?? null }
    }
    const sparse = mode === 'sparse'
    return {
      ...r,
      position,
      score: r.rank,
      engine: sparse ? 'bm25' : 'vector',
      sparse_rank: sparse ? position : null,
      sparse_score: sparse ? r.rank : null,
      dense_rank: sparse ? null : position,
      dense_score: sparse ? null : r.rank,
      graph_rank: null,
      rrf_score: null,
    }
  })
}

/**
 * RRF k isn't exposed by the API, but a passage found by one engine only has
 * rrf = 1 / (k + rank), so k falls out exactly. Returns null if every hit was
 * found by more than one engine.
 */
export function inferRrfK(hits: Hit[]): number | null {
  for (const h of hits) {
    if (!h.rrf_score) continue
    const rank =
      h.engine === 'bm25' ? h.sparse_rank : h.engine === 'vector' ? h.dense_rank : h.engine === 'graph' ? h.graph_rank : null
    if (rank != null) return Math.round(1 / h.rrf_score - rank)
  }
  return null
}

/** The `1/(k+rank)` terms behind a hybrid hit's RRF score, one per engine that found it. */
export function rrfTerms(h: Pick<Hit, 'sparse_rank' | 'dense_rank' | 'graph_rank'>, k: number) {
  return (
    [
      ['bm25', h.sparse_rank],
      ['vector', h.dense_rank],
      ['graph', h.graph_rank],
    ] as const
  ).map(([engine, rank]) => ({ engine, rank, value: rank != null ? 1 / (k + rank) : null }))
}

/** The backend's fallbacks that come back as HTTP 200 with a message in `answer`. */
export function classifyAnswer(answer: string): 'ok' | 'llm_error' | 'no_llm' | 'empty' {
  if (answer.startsWith('LLM synthesis failed')) return 'llm_error'
  if (answer.includes('Set ANTHROPIC_API_KEY')) return 'no_llm'
  if (answer.startsWith('No relevant passages were found')) return 'empty'
  return 'ok'
}
