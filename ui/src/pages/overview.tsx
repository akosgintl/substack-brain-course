import { ArrowRight, ArrowUpRight, CornerDownLeft, Gauge, Layers, Radio, Rss, Sparkles, Workflow } from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EventFeed } from '@/components/event-feed'
import { JobCard } from '@/components/job-card'
import { LatencyChart } from '@/components/latency-chart'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, Kbd, Skeleton } from '@/components/ui/misc'
import { subsystemKind, useHealth } from '@/hooks/queries'
import { startBackfill, startBackfillAll, syncNow } from '@/lib/actions'
import { publications } from '@/lib/allowlist'
import { historyStore } from '@/lib/history'
import { jobsStore } from '@/lib/jobs'
import { useStore } from '@/lib/store'
import { formatMs, formatNumber, hostOf } from '@/lib/utils'

const fade = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
})

function Stat({ label, value, sub, loading }: { label: string; value: ReactNode; sub?: ReactNode; loading?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-[12px] font-medium text-fg-2">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      )}
      {sub ? <div className="mt-2.5 text-[12px] text-muted">{sub}</div> : null}
    </Card>
  )
}

function AskHero() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const go = () => q.trim() && navigate(`/ask?q=${encodeURIComponent(q.trim())}`, { state: { autorun: true } })
  return (
    <motion.div {...fade(0)}>
      <div className="group relative rounded-2xl bg-[linear-gradient(120deg,var(--accent),var(--eng-vector),var(--eng-both))] p-px shadow-[0_20px_60px_-24px_var(--accent)]">
        <div className="flex items-center gap-3 rounded-[15px] bg-surface px-4 py-3">
          <Sparkles className="size-5 shrink-0 text-accent" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="Ask your newsletters anything, e.g. how does reciprocal rank fusion work?"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <Button variant="primary" onClick={go} disabled={!q.trim()}>
            Ask <CornerDownLeft />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function OverviewPage() {
  const health = useHealth()
  const h = health.data
  const jobs = useStore(jobsStore)
  const asks = useStore(historyStore)
  const [busy, setBusy] = useState<string | null>(null)

  const act = (key: string, fn: () => Promise<unknown>) => async () => {
    setBusy(key)
    try {
      await fn()
    } catch {
      /* toast already shown */
    } finally {
      setBusy(null)
    }
  }

  const latencies = asks.map((a) => a.response.latency_ms).sort((a, b) => a - b)
  const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : null

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={<span className="text-gradient">Your newsletters, searchable.</span>}
        description="A durable knowledge base built from technical Substacks: 3-way retrieval over BM25, pgvector and a Memgraph claim graph, answers with citations, and Inngest pipelines that keep it fresh."
        actions={
          <>
            <Button onClick={act('sync', syncNow)} loading={busy === 'sync'}>
              <Rss /> Sync now
            </Button>
            <Button variant="primary" onClick={act('all', startBackfillAll)} loading={busy === 'all'}>
              <Workflow /> Backfill all
            </Button>
          </>
        }
      />

      <AskHero />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <motion.div {...fade(1)}>
          <Stat label="Articles" value={h ? formatNumber(h.articles) : '—'} loading={health.isPending} sub={`${publications.length} allowlisted publications`} />
        </motion.div>
        <motion.div {...fade(2)}>
          <Stat
            label="Passages"
            value={h ? formatNumber(h.passages) : '—'}
            loading={health.isPending}
            sub={h && h.articles ? `${(h.passages / h.articles).toFixed(1)} per article · current revisions` : 'current revisions only'}
          />
        </motion.div>
        <motion.div {...fade(3)}>
          <Stat
            label="Claims"
            value={h?.claims != null ? formatNumber(h.claims) : '—'}
            loading={health.isPending}
            sub={
              h?.claims == null
                ? 'no claim counts from this API'
                : `${h.topics != null ? `${formatNumber(h.topics)} topics in the graph` : 'active claims'}${h.articles ? ` · ${(h.claims / h.articles).toFixed(1)} per article` : ''}`
            }
          />
        </motion.div>
        <motion.div {...fade(4)}>
          <Stat
            label="System"
            value={
              health.isError ? (
                <StatusPill kind="error" label="API down" className="text-[13px]" />
              ) : (
                <StatusPill kind={h?.status === 'ok' ? 'ok' : 'warn'} label={h?.status === 'ok' ? 'All systems up' : 'Degraded'} className="text-[13px]" />
              )
            }
            loading={health.isPending}
            sub={
              health.isError ? (
                health.error.message
              ) : (
                <span className="flex gap-3">
                  <span>Postgres {subsystemKind(h?.database) === 'ok' ? 'ok' : 'down'}</span>
                  <span>Inngest {subsystemKind(h?.inngest) === 'ok' ? 'ok' : 'down'}</span>
                  {h?.memgraph !== undefined ? <span>Memgraph {subsystemKind(h.memgraph) === 'ok' ? 'ok' : 'down'}</span> : null}
                </span>
              )
            }
          />
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <motion.div {...fade(5)}>
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Publications</CardTitle>
                <CardDescription>From publications.yaml: the only feeds the pipeline will ingest.</CardDescription>
              </div>
              <Link to="/ingest" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline">
                Ingest <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {publications.map((p) => (
                <div key={p.slug} className="flex flex-col rounded-xl border border-line bg-surface-2/40 p-4 transition-colors hover:border-line-strong">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--accent-soft),transparent)] text-[13px] font-semibold ring-1 ring-line">
                      {p.name
                        .split(/\s+/)
                        .filter((w) => /^[A-Z]/.test(w))
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold">{p.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted">{p.slug}</p>
                    </div>
                  </div>
                  {p.notes ? <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-fg-2">{p.notes}</p> : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <a href={p.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-[12px] text-muted hover:text-fg">
                      {hostOf(p.homepage)} <ArrowUpRight className="size-3" />
                    </a>
                    <Button size="sm" onClick={act(p.slug, () => startBackfill(p))} loading={busy === p.slug}>
                      Backfill
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fade(6)}>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Recent jobs</CardTitle>
                <CardDescription>Started from this browser, polled via GET /jobs.</CardDescription>
              </div>
              {jobs.length ? (
                <Link to="/ingest" className="text-[12.5px] font-medium text-accent hover:underline">
                  All {jobs.length}
                </Link>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2">
              {jobs.length ? (
                jobs.slice(0, 4).map((j) => <JobCard key={j.event_id} job={j} compact />)
              ) : (
                <EmptyState icon={<Workflow />} title="No jobs yet">
                  Backfill a publication or ingest an article and it'll be tracked here.
                </EmptyState>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <motion.div {...fade(7)}>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="size-4 text-muted" /> Answer latency, last {Math.min(asks.length, 20) || 20} asks
                </CardTitle>
                <CardDescription>latency_ms reported by POST /ask: retrieval + Claude + snapshot write.</CardDescription>
              </div>
              {median != null ? (
                <div className="text-right">
                  <p className="tabular text-[20px] font-semibold leading-none">{formatMs(median)}</p>
                  <p className="mt-1 text-[11px] text-muted">median</p>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {asks.length ? (
                <LatencyChart entries={asks} />
              ) : (
                <EmptyState icon={<Layers />} title="No answers yet">
                  Ask a question and its latency lands here. Press <Kbd>⌘K</Kbd> to start.
                </EmptyState>
              )}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fade(8)}>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="size-4 text-muted" /> Live events
                </CardTitle>
                <CardDescription>The Inngest dev server's recent events, refreshed every 5s.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <EventFeed limit={9} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
