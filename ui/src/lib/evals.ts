import type { EvalSuiteRun, FailuresReplay, VariantSummary } from './api'

/**
 * The failure taxonomy from `../evals/taxonomy.yaml`. The API returns only the
 * codes, so the names and layers live here; keep them in step with the YAML.
 */
export const FAILURE_MODES = [
  { code: 'FM-1', name: 'Phantom or dangling citation', layer: 'synthesis', evaluator: 'code' },
  { code: 'FM-2', name: 'Stale revision cited', layer: 'retrieval & graph', evaluator: 'code' },
  { code: 'FM-3', name: 'Ungrounded speculation on empty context', layer: 'synthesis', evaluator: 'code + judge' },
  { code: 'FM-4', name: 'Unfaithful claim or epistemic inflation', layer: 'synthesis', evaluator: 'faithfulness judge' },
  { code: 'FM-5', name: 'Missed cross-publication disagreement', layer: 'synthesis', evaluator: 'disagreement judge' },
  { code: 'FM-6', name: 'Lexical or relational retrieval miss', layer: 'retrieval', evaluator: 'retrieval metric' },
] as const

export const failureName = (code: string) => FAILURE_MODES.find((m) => m.code === code)?.name ?? code

/** run-eval-suite's variants, in the order it runs them. */
export const VARIANTS = [
  { key: 'sparse_bm25', label: 'Sparse', detail: 'BM25' },
  { key: 'dense_pgvector', label: 'Dense', detail: 'pgvector' },
  { key: 'hybrid_2way_rrf_k60', label: '2-way RRF', detail: 'BM25 + vector, k=60' },
  { key: 'hybrid_3way_rrf_k60', label: '3-way RRF', detail: '+ claim graph, k=60' },
] as const

const isVariant = (v: unknown): v is VariantSummary => !!v && typeof v === 'object' && 'recall_at_5' in v

export function variantRows(run: Pick<EvalSuiteRun, 'variants_summary'> | null | undefined) {
  const summary = run?.variants_summary ?? {}
  const known = VARIANTS.map((v) => ({ ...v, summary: summary[v.key] }))
  // A variant the UI doesn't know yet still shows up, under its raw key.
  const extra = Object.entries(summary)
    .filter(([k]) => !VARIANTS.some((v) => v.key === k))
    .map(([key, s]) => ({ key, label: key, detail: '', summary: s }))
  return [...known, ...extra].flatMap((r) => (isVariant(r.summary) ? [{ ...r, summary: r.summary }] : []))
}

/** Highest recall@5, ties broken by MRR. */
export function bestVariant(rows: ReturnType<typeof variantRows>) {
  return [...rows].sort((a, b) => b.summary.recall_at_5 - a.summary.recall_at_5 || b.summary.mrr - a.summary.mrr)[0]
}

export function failuresReplay(run: EvalSuiteRun | null | undefined): FailuresReplay | null {
  const r = run?.variants_summary?.failures_replay
  return r && typeof r === 'object' && 'failures_replayed' in r ? (r as FailuresReplay) : null
}

export const pct = (v: number | null | undefined, digits = 0) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`)
