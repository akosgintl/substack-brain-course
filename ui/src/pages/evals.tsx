import { Gauge, ListChecks, Play, ShieldAlert, Tags } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { EvalVerdicts } from '@/components/eval-verdicts'
import { JobCard } from '@/components/job-card'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton, EmptyState, Skeleton } from '@/components/ui/misc'
import { useEvalReport } from '@/hooks/queries'
import { runEvalSuite } from '@/lib/actions'
import type { SnapshotEval } from '@/lib/api'
import { bestVariant, FAILURE_MODES, failuresReplay, pct, variantRows } from '@/lib/evals'
import { jobsStore } from '@/lib/jobs'
import { useStore } from '@/lib/store'
import { cn, formatNumber, timeAgo } from '@/lib/utils'

const LIMITS = [10, 25, 50]

// Same colours the Search Lab uses for each engine.
const VARIANT_COLOR: Record<string, string> = {
  sparse_bm25: 'var(--eng-bm25)',
  dense_pgvector: 'var(--eng-vector)',
  hybrid_2way_rrf_k60: 'var(--eng-both)',
  hybrid_3way_rrf_k60: 'var(--eng-graph)',
}

function Stat({ label, value, sub, loading }: { label: string; value: ReactNode; sub?: ReactNode; loading?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-[12px] font-medium text-fg-2">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="tabular mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      )}
      {sub ? <div className="mt-2.5 text-[12px] text-muted">{sub}</div> : null}
    </Card>
  )
}

function Bar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--grid)]">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%`, background: color }} />
    </div>
  )
}

function SuiteCard() {
  const [replay, setReplay] = useState(true)
  const [busy, setBusy] = useState(false)
  const jobs = useStore(jobsStore).filter((j) => j.kind === 'eval')
  const start = async () => {
    setBusy(true)
    await runEvalSuite('golden_v1', replay).catch(() => {}) // the action already raised a toast
    setBusy(false)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="size-4 text-muted" /> Run the suite
        </CardTitle>
        <CardDescription>
          <span className="font-mono">POST /evals/run</span> sends <span className="font-mono">kb/eval.run</span>.{' '}
          <span className="font-mono">run-eval-suite</span> ranks the golden benchmark with all four retrieval variants, one durable step each, and can replay the last 20 rows of the <span className="font-mono">failures</span> table.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-2">
          <input type="checkbox" checked={replay} onChange={(e) => setReplay(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Replay recent failures <span className="font-mono text-[11.5px] text-muted">include_failures_table</span>
        </label>
        <Button variant="primary" loading={busy} onClick={start}>
          <Play /> Run golden_v1
        </Button>
        {jobs.length ? (
          <div className="space-y-2 pt-1">
            <AnimatePresence initial={false}>
              {jobs.slice(0, 3).map((j) => (
                <JobCard key={j.event_id} job={j} />
              ))}
            </AnimatePresence>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function BenchmarkCard({ report, loading }: { report: ReturnType<typeof useEvalReport>['data']; loading: boolean }) {
  const run = report?.latest_suite_run
  const rows = variantRows(run)
  const replay = failuresReplay(run)
  const best = bestVariant(rows)?.key
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-4 text-muted" /> Retrieval benchmark
          </CardTitle>
          <CardDescription>
            Recall@5, MRR and cross-publication coverage on the fixture corpus in <span className="font-mono">evals/golden_benchmark.yaml</span>, not the live database.
          </CardDescription>
        </div>
        {run ? (
          <div className="shrink-0 text-right font-mono text-[11px] text-muted">
            <p>{run.suite_name}</p>
            <p>{timeAgo(run.created_at)}</p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState icon={<Gauge />} title="No suite run yet">
            Run the suite to compare sparse, dense, 2-way and 3-way RRF.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                  <th className="pb-2 font-medium">Variant</th>
                  <th className="pb-2 pl-4 font-medium">Recall@5</th>
                  <th className="pb-2 pl-4 font-medium">MRR</th>
                  <th className="pb-2 pl-4 font-medium">Cross-pub</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-line">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: VARIANT_COLOR[r.key] ?? 'var(--muted)' }} />
                        <span className="font-medium">{r.label}</span>
                        {r.key === best ? <Badge variant="good">best</Badge> : null}
                      </div>
                      {r.detail ? <p className="mt-0.5 pl-4 text-[11.5px] text-muted">{r.detail}</p> : null}
                    </td>
                    {[r.summary.recall_at_5, r.summary.mrr, r.summary.cross_pub_coverage].map((v, i) => (
                      <td key={i} className="w-[22%] py-2.5 pl-4">
                        <p className="tabular mb-1 font-mono text-[12px]">{i === 1 ? v.toFixed(3) : pct(v)}</p>
                        <Bar value={v} color={VARIANT_COLOR[r.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {replay ? (
              <p className="mt-4 border-t border-line pt-3 text-[12px] text-fg-2">
                Replayed {replay.failures_replayed} failure{replay.failures_replayed === 1 ? '' : 's'}
                {replay.functions_affected.length ? (
                  <>
                    {' from '}
                    <span className="font-mono">{replay.functions_affected.join(', ')}</span>
                  </>
                ) : null}
                .
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TaxonomyCard({ counts, window, loading }: { counts: Record<string, number>; window: number; loading: boolean }) {
  const max = Math.max(1, ...Object.values(counts))
  const unknown = Object.keys(counts).filter((c) => !FAILURE_MODES.some((m) => m.code === c))
  const rows = [
    ...FAILURE_MODES,
    ...unknown.map((code) => ({ code, name: code, layer: '', evaluator: '' })),
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="size-4 text-muted" /> Failure taxonomy
        </CardTitle>
        <CardDescription>
          Codes from <span className="font-mono">evals/taxonomy.yaml</span>, counted over the last {window} evaluated answers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((m) => {
          const n = counts[m.code] ?? 0
          return (
            <div key={m.code}>
              <div className="mb-1 flex items-baseline gap-2 text-[13px]">
                <span className="font-mono text-[11.5px] text-muted">{m.code}</span>
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <span className={cn('tabular font-mono text-[12px]', n ? 'text-critical' : 'text-muted')}>{loading ? '…' : n}</span>
              </div>
              <Bar value={n / max} color={n ? 'var(--critical)' : 'var(--grid)'} />
              {m.layer ? (
                <p className="mt-1 text-[11px] text-muted">
                  {m.layer} · {m.evaluator}
                </p>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function RecentCard({ evals, loading }: { evals: SnapshotEval[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted" /> Recent answer evaluations
        </CardTitle>
        <CardDescription>
          Every <span className="font-mono">POST /ask</span> emits <span className="font-mono">kb/answer.produced</span>; <span className="font-mono">evaluate-answer</span> scores the snapshot with code assertions, then binary PASS/FAIL faithfulness and disagreement judges.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)
        ) : !evals.length ? (
          <EmptyState icon={<ShieldAlert />} title="Nothing evaluated yet">
            Ask a question. Its snapshot is scored in the background a few seconds later.
          </EmptyState>
        ) : (
          evals.map((e) => (
            <div key={e.snapshot_id} className="rounded-xl border border-line bg-surface-2/40 p-3.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <EvalVerdicts e={e} className="flex-1" />
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted">
                  {e.snapshot_id.slice(0, 12)}…
                  <CopyButton value={e.snapshot_id} label="Copy snapshot id" />
                </span>
                <span className="text-[11px] text-muted">{timeAgo(e.created_at)}</span>
              </div>
              {e.faithfulness_critique ? (
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-fg-2">{e.faithfulness_critique}</p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function EvalsPage() {
  const [limit, setLimit] = useState(10)
  const q = useEvalReport(limit)
  const r = q.data
  const n = r?.recent_evaluations.length ?? 0
  const run = r?.latest_suite_run

  return (
    <div>
      <PageHeader
        eyebrow="Week 5 · evaluation"
        title="Evals"
        description={
          <>
            Read from <span className="font-mono">GET /evals/latest</span>, refreshed every 10s. Answers are scored as they're produced; the multi-variant retrieval benchmark runs on demand.
          </>
        }
        actions={
          <div role="radiogroup" aria-label="Evaluation window" className="flex rounded-xl border border-line p-0.5">
            {LIMITS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={limit === l}
                onClick={() => setLimit(l)}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-1 text-[12px] font-medium',
                  limit === l ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
                )}
              >
                last {l}
              </button>
            ))}
          </div>
        }
      />

      {q.isError ? (
        <Card className="mb-6">
          <EmptyState icon={<ShieldAlert />} title="Could not load the evaluation report">
            {q.error.message} If the API is up, run <span className="font-mono">make migrate</span>: the <span className="font-mono">eval_results</span> and <span className="font-mono">eval_runs</span> tables are new in week 5.
          </EmptyState>
        </Card>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Evaluated answers" value={r ? formatNumber(r.total_evaluated_snapshots) : '—'} loading={q.isPending} sub="all time" />
        <Stat label="Code checks pass" value={pct(r?.recent_deterministic_pass_rate)} loading={q.isPending} sub={`last ${n} answers`} />
        <Stat label="Faithfulness pass" value={pct(r?.recent_faithfulness_pass_rate)} loading={q.isPending} sub={`last ${n} answers`} />
        <Stat
          label="Latest suite run"
          value={run ? timeAgo(run.created_at) : '—'}
          loading={q.isPending}
          sub={run ? <span className="font-mono">{run.suite_name}</span> : 'never'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <BenchmarkCard report={r} loading={q.isPending} />
          <RecentCard evals={r?.recent_evaluations ?? []} loading={q.isPending} />
        </div>
        <div className="space-y-6">
          <SuiteCard />
          <TaxonomyCard counts={r?.failure_taxonomy_counts ?? {}} window={n} loading={q.isPending} />
        </div>
      </div>
    </div>
  )
}
