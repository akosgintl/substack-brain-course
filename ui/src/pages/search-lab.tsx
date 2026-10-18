import { useQueries } from '@tanstack/react-query'
import { ArrowUpRight, FlaskConical, Pin, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ENGINE, EngineBadge, EngineDot } from '@/components/engine'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { type Engine, type Hit, type Mode, api, inferRrfK, toHits } from '@/lib/api'
import { cn, formatDate, formatMs } from '@/lib/utils'

const COLUMNS: { mode: Mode; engine: Engine; title: string; scoreLabel: string; blurb: string }[] = [
  { mode: 'sparse', engine: 'bm25', title: 'Full-text · BM25', scoreLabel: 'ts_rank', blurb: 'Postgres tsvector. Nails exact tokens, misses synonyms.' },
  { mode: 'dense', engine: 'vector', title: 'Vector · pgvector', scoreLabel: 'cosine similarity', blurb: 'Embeddings. Understands meaning, blurs exact tokens.' },
  { mode: 'hybrid', engine: 'both', title: 'Hybrid · RRF', scoreLabel: 'RRF score', blurb: 'Both lists fused by rank position, not by score.' },
]

const SAMPLES = ['reciprocal rank fusion', 'idempotency key', 'agent memory', 'LoRA fine-tuning', 'websearch_to_tsquery', 'durable execution retries']

interface ColumnData {
  hits: Hit[]
  ms: number
}

type Positions = Map<string, Partial<Record<Mode, number>>>

function LabCard({
  hit,
  mode,
  max,
  positions,
  k,
  highlight,
  pinned,
  expanded,
  onHover,
  onPin,
}: {
  hit: Hit
  mode: Mode
  max: number
  positions: Positions
  k: number
  highlight: string | null
  pinned: boolean
  expanded: boolean
  onHover: (id: string | null) => void
  onPin: (id: string) => void
}) {
  const pos = positions.get(hit.passage_id) ?? {}
  const others = COLUMNS.filter((c) => c.mode !== mode)
  const lit = highlight === hit.passage_id
  const dim = highlight != null && !lit
  const barEngine: Engine = mode === 'hybrid' ? hit.engine : mode === 'sparse' ? 'bm25' : 'vector'

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dim ? 0.35 : 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => onHover(hit.passage_id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onPin(hit.passage_id)}
      className={cn(
        'relative cursor-pointer rounded-xl border bg-surface p-3.5 transition-[border-color,box-shadow] duration-200',
        lit ? 'border-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'border-line hover:border-line-strong',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="tabular w-5 shrink-0 pt-0.5 font-mono text-[13px] font-semibold text-muted">{hit.position}</span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{hit.title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">
            {hit.author ?? 'Unknown'} · {formatDate(hit.published_at)}
          </p>
        </div>
        {pinned ? <Pin className="size-3.5 shrink-0 text-accent" /> : null}
      </div>

      <p className={cn('mt-2 pl-8 text-[12px] leading-relaxed text-fg-2', !expanded && 'line-clamp-3')}>{hit.text}</p>

      <div className="mt-3 pl-8">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className={cn('h-full rounded-full', ENGINE[barEngine].bar)}
              initial={{ width: 0 }}
              animate={{ width: `${max > 0 ? Math.max((hit.score / max) * 100, 4) : 0}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="tabular w-14 text-right font-mono text-[11px] text-fg-2">{hit.score.toFixed(4)}</span>
        </div>

        {mode === 'hybrid' ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <EngineBadge engine={hit.engine} />
            <span className="font-mono text-[10.5px] text-muted">
              {[hit.sparse_rank != null ? `1/(${k}+${hit.sparse_rank})` : null, hit.dense_rank != null ? `1/(${k}+${hit.dense_rank})` : null]
                .filter(Boolean)
                .join(' + ')}
            </span>
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
          {others.map((c) => {
            const p = pos[c.mode]
            return (
              <span
                key={c.mode}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono',
                  p ? 'border-line-strong text-fg-2' : 'border-dashed border-line text-muted',
                )}
              >
                <EngineDot engine={c.engine} className={cn('size-1.5', !p && 'opacity-40')} />
                {c.mode === 'sparse' ? 'BM25' : c.mode === 'dense' ? 'Vector' : 'Hybrid'} {p ? `#${p}` : '—'}
              </span>
            )
          })}
          <a
            href={hit.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto inline-flex items-center gap-0.5 text-muted hover:text-accent"
            aria-label="Open article"
          >
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </motion.li>
  )
}

function Column({
  col,
  data,
  pending,
  error,
  ...rest
}: {
  col: (typeof COLUMNS)[number]
  data?: ColumnData
  pending: boolean
  error: Error | null
  positions: Positions
  k: number
  highlight: string | null
  pinnedId: string | null
  expanded: boolean
  onHover: (id: string | null) => void
  onPin: (id: string) => void
}) {
  const max = Math.max(0, ...(data?.hits.map((h) => h.score) ?? []))
  return (
    <section className="min-w-0">
      <div className="mb-3 rounded-xl border border-line bg-surface/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
            <EngineDot engine={col.engine} className="size-2.5" />
            {col.title}
          </h2>
          <span className="tabular font-mono text-[11px] text-muted">
            {data ? `${data.hits.length} · ${formatMs(data.ms)}` : pending ? '…' : ''}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-fg-2">{col.blurb}</p>
        <p className="mt-1 font-mono text-[10.5px] text-muted">
          GET /search?mode={col.mode} · score = {col.scoreLabel}
        </p>
      </div>
      {pending ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <EmptyState icon={<Search />} title="Search failed">
            {error.message}
          </EmptyState>
        </Card>
      ) : data && data.hits.length === 0 ? (
        <Card>
          <EmptyState icon={<Search />} title="No matches">
            {col.mode === 'sparse' ? 'No passage contains these terms. Full-text needs token overlap.' : 'Nothing came back.'}
          </EmptyState>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {data?.hits.map((h) => (
            <LabCard key={h.passage_id} hit={h} mode={col.mode} max={max} pinned={rest.pinnedId === h.passage_id} {...rest} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Metric({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2/40 px-4 py-3">
      <p className="text-[11.5px] font-medium text-fg-2">{label}</p>
      <p className="tabular mt-1 text-[20px] font-semibold leading-tight">{value}</p>
      {children ? <div className="mt-1 text-[11.5px] text-muted">{children}</div> : null}
    </div>
  )
}

export function SearchLabPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const limit = Math.min(Math.max(Number(params.get('limit')) || 8, 1), 25)
  const [draft, setDraft] = useState(q)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => setDraft(q), [q])
  useEffect(() => setPinned(null), [q, limit])

  const results = useQueries({
    queries: COLUMNS.map((c) => ({
      queryKey: ['search', c.mode, q, limit],
      queryFn: async (): Promise<ColumnData> => {
        const t = performance.now()
        const res = await api.search(q, c.mode, limit)
        return { hits: toHits(c.mode, res.results), ms: performance.now() - t }
      },
      enabled: !!q,
      staleTime: 5 * 60_000,
      retry: false,
    })),
  })

  const [sparse, dense, hybrid] = results.map((r) => r.data)

  const positions: Positions = useMemo(() => {
    const m: Positions = new Map()
    COLUMNS.forEach((c, i) => {
      for (const h of results[i].data?.hits ?? []) {
        m.set(h.passage_id, { ...m.get(h.passage_id), [c.mode]: h.position })
      }
    })
    return m
  }, [results])

  const k = (hybrid && inferRrfK(hybrid.hits)) ?? 60
  const overlap = sparse && dense ? sparse.hits.filter((h) => dense.hits.some((d) => d.passage_id === h.passage_id)).length : null
  const mix = hybrid
    ? (['both', 'bm25', 'vector'] as Engine[]).map((e) => ({ e, n: hybrid.hits.filter((h) => h.engine === e).length }))
    : null
  const top = hybrid?.hits[0]

  const run = (text = draft, n = limit) => {
    const t = text.trim()
    if (t) setParams({ q: t, limit: String(n) })
  }

  return (
    <div>
      <PageHeader
        eyebrow="GET /search × 3"
        title="Search Lab"
        description="One query, three retrievers, side by side. Hover a passage to find it in every list; click to pin it."
      />

      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="Search passages…" className="h-11 pl-10 text-[15px]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[12.5px] text-fg-2">
            Top
            <select
              value={limit}
              onChange={(e) => run(draft || q, Number(e.target.value))}
              className="h-11 cursor-pointer rounded-xl border border-line bg-surface-2/60 px-3 text-[13px] text-fg outline-none focus:border-accent"
            >
              {[5, 8, 10, 15, 25].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button variant="primary" size="lg" onClick={() => run()} disabled={!draft.trim()} loading={results.some((r) => r.isFetching)}>
            Compare
          </Button>
        </div>
      </Card>

      {!q ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Why three columns?</CardTitle>
              <CardDescription>
                Neither engine is enough alone. Reciprocal Rank Fusion scores each passage by <span className="font-mono">Σ 1/(k + rank)</span> across engines, so agreement between two very different engines beats being one engine's favourite.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {COLUMNS.map((c) => (
                <div key={c.mode} className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                  <EngineBadge engine={c.engine} />
                  <p className="mt-2 text-[13px] font-medium">{c.title}</p>
                  <p className="mt-1 text-[12px] text-fg-2">{c.blurb}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Try a query</CardTitle>
              <CardDescription>Exact tokens favour BM25; paraphrases favour vectors.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => run(s)}
                  className="cursor-pointer rounded-full border border-line bg-surface-2/40 px-3 py-1.5 font-mono text-[12px] transition-colors hover:border-accent/40 hover:bg-accent-soft"
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="BM25 ∩ Vector" value={overlap != null ? `${overlap} / ${limit}` : '—'}>
              passages both engines put in their top {limit}
            </Metric>
            <Metric label="Hybrid mix" value={mix ? `${mix[0].n} both` : '—'}>
              {mix ? (
                <span className="flex flex-wrap gap-x-3">
                  {mix.map(({ e, n }) => (
                    <span key={e} className="inline-flex items-center gap-1">
                      <EngineDot engine={e} /> {n} {ENGINE[e].label}
                    </span>
                  ))}
                </span>
              ) : null}
            </Metric>
            <Metric label="RRF k" value={String(k)}>
              {hybrid && inferRrfK(hybrid.hits) != null ? 'inferred from a single-engine hit' : 'assumed default (settings.rrf_k)'}
            </Metric>
            <Metric label="Latency" value={results.every((r) => r.data) ? formatMs(Math.max(...results.map((r) => r.data!.ms))) : '—'}>
              {results.every((r) => r.data)
                ? `BM25 ${formatMs(sparse!.ms)} · Vector ${formatMs(dense!.ms)} · Hybrid ${formatMs(hybrid!.ms)}`
                : 'slowest of the three, round trip'}
            </Metric>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[12px] text-muted">
              {pinned ? 'Pinned: click the passage again to release.' : 'Each card shows where the same passage ranks in the other two lists.'}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-fg-2">
              <input type="checkbox" checked={expanded} onChange={(e) => setExpanded(e.target.checked)} className="accent-[var(--accent)]" />
              Full passage text
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {COLUMNS.map((c, i) => (
              <Column
                key={c.mode}
                col={c}
                data={results[i].data}
                pending={results[i].isPending}
                error={results[i].error}
                positions={positions}
                k={k}
                highlight={hovered ?? pinned}
                pinnedId={pinned}
                expanded={expanded}
                onHover={setHovered}
                onPin={(id) => setPinned((p) => (p === id ? null : id))}
              />
            ))}
          </div>

          {top && top.rrf_score ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="size-4 text-muted" /> How hybrid #1 got its score
                </CardTitle>
                <CardDescription>{top.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[13px]">
                  {top.sparse_rank != null ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                      <EngineDot engine="bm25" /> BM25 rank {top.sparse_rank} → 1/({k}+{top.sparse_rank}) = {(1 / (k + top.sparse_rank)).toFixed(5)}
                    </span>
                  ) : (
                    <span className="rounded-lg border border-dashed border-line px-3 py-2 text-muted">not in BM25 candidates → 0</span>
                  )}
                  <span className="text-muted">+</span>
                  {top.dense_rank != null ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                      <EngineDot engine="vector" /> Vector rank {top.dense_rank} → 1/({k}+{top.dense_rank}) = {(1 / (k + top.dense_rank)).toFixed(5)}
                    </span>
                  ) : (
                    <span className="rounded-lg border border-dashed border-line px-3 py-2 text-muted">not in vector candidates → 0</span>
                  )}
                  <span className="text-muted">=</span>
                  <span className="rounded-lg bg-accent-soft px-3 py-2 font-semibold">{top.rrf_score.toFixed(5)}</span>
                </div>
                <p className="mt-3 text-[12px] text-muted">
                  Ranks come from each engine's candidate list (max(limit×3, 15) deep), so a hybrid hit can rank deeper than the top {limit} shown in the BM25 and Vector columns.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
