import { ArrowUpRight, FileText, Rss, Workflow, X } from 'lucide-react'
import { motion } from 'motion/react'
import type { InngestRun } from '@/lib/api'
import { forgetJob, isDone, type JobPhase, type TrackedJob, useJob, useJobRuns } from '@/lib/jobs'
import { cn, timeAgo } from '@/lib/utils'
import { StatusPill, type StatusKind } from './status'
import { Button } from './ui/button'
import { JsonView } from './ui/misc'
import { Tip } from './ui/overlays'

const KIND = {
  backfill: { icon: Workflow, label: 'Backfill' },
  article: { icon: FileText, label: 'Article' },
  sync: { icon: Rss, label: 'Freshness poll' },
} as const

const PHASE: Record<JobPhase, { kind: StatusKind; label: string }> = {
  waiting: { kind: 'idle', label: 'Queued' },
  running: { kind: 'running', label: 'Running' },
  completed: { kind: 'ok', label: 'Completed' },
  failed: { kind: 'error', label: 'Failed' },
  missing: { kind: 'warn', label: 'Not found' },
}

function Ring({ value, total, active }: { value: number; total: number; active: boolean }) {
  const r = 17
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(value / total, 1) : active ? 0.15 : 1
  return (
    <svg viewBox="0 0 40 40" className={cn('size-11 -rotate-90', active && total === 0 && 'animate-spin')}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--grid)" strokeWidth="3.5" />
      <motion.circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </svg>
  )
}

/** A one-line reading of a run's output, per function. */
function summarise(run: InngestRun | undefined): string | null {
  const out = run?.output as Record<string, unknown> | null | undefined
  if (!out || typeof out !== 'object') return null
  if ('discovered' in out) return `${out.discovered} new article${out.discovered === 1 ? '' : 's'} discovered`
  if (out.status === 'unchanged') return 'Unchanged: same content hash, no re-embedding'
  if ('passage_count' in out) return `${out.passage_count} passages written`
  if ('polled_count' in out && Array.isArray(out.results)) {
    const rs = out.results as { status: number; new_articles: number }[]
    const nm = rs.filter((r) => r.status === 304).length
    const fresh = rs.reduce((n, r) => n + (r.new_articles || 0), 0)
    return `${out.polled_count} feeds polled · ${nm} × 304 Not Modified · ${fresh} new`
  }
  return null
}

export function JobCard({ job, compact = false }: { job: TrackedJob; compact?: boolean }) {
  const q = useJob(job)
  const phase: JobPhase = q.data?.phase ?? (q.isError ? 'failed' : 'waiting')
  const active = !isDone(phase)
  const runs = useJobRuns(job, active)
  const run = runs.data?.[0]
  const s = q.data?.status
  const done = s?.articles_done ?? 0
  const total = s?.articles_total ?? 0
  const { icon: Icon, label } = KIND[job.kind]
  const summary = summarise(run)
  const failure = s?.failures?.[0] ?? (run?.status === 'Failed' ? run.output : undefined)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="group rounded-xl border border-line bg-surface-2/40 p-3.5 transition-colors hover:border-line-strong"
    >
      <div className="flex items-center gap-3">
        {job.kind === 'backfill' ? (
          <div className="relative grid place-items-center">
            <Ring value={done} total={total} active={active} />
            <span className="tabular absolute text-[10px] font-semibold">
              {total > 0 ? `${Math.round((done / total) * 100)}%` : <Icon className="size-3.5 text-muted" />}
            </span>
          </div>
        ) : (
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface">
            <Icon className="size-4.5 text-fg-2" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13.5px] font-medium">{job.label}</p>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {label} · {timeAgo(job.created_at)}
            {job.kind === 'backfill' && total > 0 ? ` · ${done}/${total} articles` : ''}
            {job.priority_offset_s ? ` · +${job.priority_offset_s}s priority` : ''}
          </p>
        </div>
        <StatusPill kind={PHASE[phase].kind} label={PHASE[phase].label} />
        <div className="flex items-center">
          <Tip content="Open run in Inngest">
            <a
              href={job.trace_url}
              target="_blank"
              rel="noreferrer"
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            >
              <ArrowUpRight className="size-3.5" />
            </a>
          </Tip>
          <Tip content="Stop tracking">
            <Button variant="ghost" size="icon-sm" aria-label="Stop tracking" onClick={() => forgetJob(job.event_id)}>
              <X />
            </Button>
          </Tip>
        </div>
      </div>
      {!compact && (summary || failure || s?.run_status) ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-[12px] text-fg-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
            <span>event {job.event_id}</span>
            {s?.run_status ? <span>run {s.run_status}</span> : null}
            {run?.function_id ? <span>fn {run.function_id}</span> : null}
          </div>
          {summary ? <p>{summary}</p> : null}
          {failure ? <JsonView value={failure} className="max-h-40" /> : null}
        </div>
      ) : null}
    </motion.div>
  )
}
