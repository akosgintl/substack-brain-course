import { useQuery } from '@tanstack/react-query'
import {
  CircleAlert,
  CircleCheck,
  Clock,
  CornerDownLeft,
  FlaskConical,
  History,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Answer, type SourceLookup } from '@/components/answer'
import { EngineBadge } from '@/components/engine'
import { PageHeader } from '@/components/page-header'
import { RankChip } from '@/components/passage'
import { StatusPill } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { CopyButton, EmptyState, Kbd, Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/overlays'
import { type AskResponse, type Hit, api, classifyAnswer, toHits } from '@/lib/api'
import { type AskEntry, deleteAsk, historyStore, saveAsk } from '@/lib/history'
import { useStore } from '@/lib/store'
import { cn, formatDate, formatMs, timeAgo } from '@/lib/utils'

const SUGGESTIONS = [
  'How does Reciprocal Rank Fusion combine BM25 and vector search?',
  'What makes a workflow step durable, and why does idempotency matter?',
  'How should I evaluate a RAG pipeline in production?',
  'How do LLM agents implement long-term memory?',
]
const LIMITS = [3, 5, 8, 10]

interface Run {
  key: string
  question: string
  limit: number
  startedAt: number
}

interface View {
  question: string
  limit: number
  response?: AskResponse
  passages?: Hit[] | null
  askError?: Error | null
  sourcesPending: boolean
  answerPending: boolean
  at: number
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [])
  return <span className="tabular font-mono">{((now - since) / 1000).toFixed(1)}s</span>
}

function Stage({ done, active, label, detail }: { done: boolean; active: boolean; label: string; detail?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 text-[13px]', done ? 'text-fg' : active ? 'text-fg' : 'text-muted')}>
      {done ? (
        <CircleCheck className="size-4 text-good" />
      ) : active ? (
        <LoaderCircle className="size-4 animate-spin text-accent" />
      ) : (
        <span className="grid size-4 place-items-center">
          <span className="size-1.5 rounded-full bg-muted" />
        </span>
      )}
      <span className="font-medium">{label}</span>
      {detail ? <span className="text-muted">{detail}</span> : null}
    </div>
  )
}

function Notice({ kind, title, children }: { kind: 'warn' | 'error'; title: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'mb-5 flex gap-3 rounded-xl border p-3.5 text-[13px]',
        kind === 'error' ? 'border-critical/30 bg-critical/5' : 'border-warning/35 bg-warning/5',
      )}
    >
      <CircleAlert className={cn('mt-0.5 size-4 shrink-0', kind === 'error' ? 'text-critical' : 'text-warning')} />
      <div>
        <p className="font-medium">{title}</p>
        <div className="mt-0.5 text-fg-2">{children}</div>
      </div>
    </div>
  )
}

function SourceList({
  passages,
  response,
  focused,
  pending,
}: {
  passages: Hit[] | null | undefined
  response?: AskResponse
  focused: number | null
  pending: boolean
}) {
  const cited = new Set(response?.citations.map((c) => c.passage_id))
  if (pending && !passages) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }
  // Fall back to the citations alone if the parallel search didn't come back.
  const items: (Partial<Hit> & { title: string; url: string; passage_id: string })[] =
    passages ?? response?.citations.map((c) => ({ ...c, text: '' })) ?? []
  if (!items.length) return <EmptyState icon={<MessageSquareText />} title="No passages retrieved" />

  return (
    <ol className="space-y-2.5">
      {items.map((p, i) => {
        const n = i + 1
        const isCited = cited.has(p.passage_id)
        return (
          <motion.li
            id={`source-${n}`}
            key={p.passage_id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              'rounded-xl border bg-surface-2/40 p-3.5 transition-all duration-300',
              focused === n ? 'border-accent ring-4 ring-accent/15' : 'border-line',
              response && !isCited && 'opacity-60 hover:opacity-100',
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-md font-mono text-[11px] font-semibold',
                  isCited ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted ring-1 ring-line',
                )}
              >
                {n}
              </span>
              <div className="min-w-0 flex-1">
                <a href={p.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[13px] font-semibold leading-snug hover:text-accent">
                  {p.title}
                </a>
                <p className="mt-0.5 truncate text-[11.5px] text-muted">
                  {p.author ?? 'Unknown author'}
                  {p.published_at ? ` · ${formatDate(p.published_at)}` : ''}
                </p>
              </div>
            </div>
            {p.text ? <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-fg-2">{p.text}</p> : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {p.engine ? <EngineBadge engine={p.engine} /> : null}
              {p.sparse_rank != null ? <RankChip label="BM25" rank={p.sparse_rank} /> : null}
              {p.dense_rank != null ? <RankChip label="Vector" rank={p.dense_rank} /> : null}
              {response ? (
                <span className={cn('ml-auto text-[11px] font-medium', isCited ? 'text-good-text' : 'text-muted')}>
                  {isCited ? 'Cited' : 'Not cited'}
                </span>
              ) : null}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}

function HistoryList({ entries, onPick, activeId }: { entries: AskEntry[]; onPick: (e: AskEntry) => void; activeId?: string }) {
  if (!entries.length) {
    return (
      <EmptyState icon={<History />} title="No history yet">
        Answers you get here are remembered in this browser.
      </EmptyState>
    )
  }
  return (
    <ul className="space-y-1.5">
      {entries.map((e) => (
        <li key={e.id} className="group flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPick(e)}
            className={cn(
              'min-w-0 flex-1 cursor-pointer rounded-xl border px-3.5 py-2.5 text-left transition-colors',
              activeId === e.id ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface-2/30 hover:border-line-strong',
            )}
          >
            <p className="truncate text-[13px] font-medium">{e.question}</p>
            <p className="tabular mt-0.5 text-[11.5px] text-muted">
              {timeAgo(e.at)} · {formatMs(e.response.latency_ms)} · {e.response.citations.length} cited
            </p>
          </button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete from history" className="opacity-0 group-hover:opacity-100" onClick={() => deleteAsk(e.id)}>
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function AskPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const history = useStore(historyStore)
  const [question, setQuestion] = useState(params.get('q') ?? '')
  const [limit, setLimit] = useState(5)
  const [run, setRun] = useState<Run | null>(null)
  const [saved, setSaved] = useState<AskEntry | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const askQ = useQuery({
    queryKey: ['ask', run?.key],
    queryFn: () => api.ask(run!.question, run!.limit),
    enabled: !!run,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  // Same hybrid retrieval POST /ask runs internally (same query, same limit,
  // deterministic tie-break), so it returns the passages behind [1], [2], ...
  // with their text and ranks, which the /ask response doesn't include.
  const sourcesQ = useQuery({
    queryKey: ['ask-sources', run?.key],
    queryFn: async () => toHits('hybrid', (await api.search(run!.question, 'hybrid', run!.limit)).results),
    enabled: !!run,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  const submit = useCallback(
    (text: string, n = limit) => {
      const q = text.trim()
      if (!q) return
      setQuestion(q)
      setSaved(null)
      setFocused(null)
      setRun({ key: `${Date.now()}`, question: q, limit: n, startedAt: Date.now() })
      setParams({ q }, { replace: true })
    },
    [limit, setParams],
  )

  // Arriving from the palette / overview with "autorun": ask straight away, once.
  const handled = useRef<string | null>(null)
  useEffect(() => {
    const state = location.state as { autorun?: boolean } | null
    const q = params.get('q')
    if (state?.autorun && q && handled.current !== location.key) {
      handled.current = location.key
      submit(q)
      navigate(`${location.pathname}?q=${encodeURIComponent(q)}`, { replace: true, state: null })
    }
  }, [location, params, submit, navigate])

  // Remember the answer once both requests have settled.
  useEffect(() => {
    if (!run || !askQ.data || sourcesQ.isPending) return
    saveAsk({
      id: askQ.data.snapshot_id,
      question: run.question,
      limit: run.limit,
      at: run.startedAt,
      response: askQ.data,
      passages: sourcesQ.data ?? null,
    })
  }, [run, askQ.data, sourcesQ.isPending, sourcesQ.data])

  const view: View | null = saved
    ? { ...saved, sourcesPending: false, answerPending: false }
    : run
      ? {
          question: run.question,
          limit: run.limit,
          at: run.startedAt,
          response: askQ.data,
          passages: sourcesQ.data ?? (sourcesQ.isError ? null : undefined),
          askError: askQ.error,
          sourcesPending: sourcesQ.isPending,
          answerPending: askQ.isPending,
        }
      : null

  const lookup: SourceLookup = useMemo(() => {
    return (n: number) => {
      const p = view?.passages?.[n - 1]
      if (p) return p
      const c = view?.response?.citations.find((x) => x.citation_idx === n)
      return c ? { ...c, text: '', published_at: '' } : undefined
    }
  }, [view?.passages, view?.response])

  const selectCitation = (n: number) => {
    setFocused(n)
    document.getElementById(`source-${n}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const answerKind = view?.response ? classifyAnswer(view.response.answer) : null
  const r = view?.response

  return (
    <div>
      <PageHeader
        eyebrow="POST /ask"
        title="Ask the brain"
        description="Hybrid retrieval picks the passages, Claude writes an answer citing them inline. Hover a citation to read its source."
        actions={
          <Button variant="ghost" onClick={() => setHistoryOpen(true)}>
            <History /> History <span className="tabular text-muted">{history.length}</span>
          </Button>
        }
      />

      <Card className="p-2">
        <Textarea
          ref={inputRef}
          value={question}
          rows={2}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit(question)
            }
          }}
          placeholder="What do you want to know?"
          className="border-0 bg-transparent text-[16px] hover:border-0 focus:bg-transparent focus:ring-0"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
          <div className="flex items-center gap-2 text-[12.5px] text-fg-2">
            <span>Passages</span>
            <div className="flex rounded-lg border border-line bg-surface-2/60 p-0.5">
              {LIMITS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={cn(
                    'tabular h-6 min-w-7 cursor-pointer rounded-md px-1.5 text-[12px] font-medium transition-colors',
                    limit === n ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11.5px] text-muted sm:inline">
              <Kbd>↵</Kbd> to ask · <Kbd>⇧↵</Kbd> new line
            </span>
            <Button variant="primary" onClick={() => submit(question)} disabled={!question.trim()} loading={!!view?.answerPending}>
              Ask <CornerDownLeft />
            </Button>
          </div>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {!view ? (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Try one of these</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/30 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:border-accent/40 hover:bg-accent-soft"
                  >
                    {s}
                    <CornerDownLeft className="size-3.5 shrink-0 text-muted" />
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent answers</CardTitle>
              </CardHeader>
              <CardContent>
                <HistoryList entries={history.slice(0, 6)} onPick={setSaved} />
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={saved?.id ?? run?.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
          >
            <Card className="min-w-0">
              <CardHeader className="border-b border-line pb-4">
                <p className="text-[12px] font-medium text-muted">Question</p>
                <p className="text-[17px] font-semibold leading-snug tracking-tight">{view.question}</p>
              </CardHeader>
              <CardContent className="pt-5">
                {view.answerPending && run ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-surface-2/40 px-4 py-3">
                      <Stage
                        done={!view.sourcesPending}
                        active={view.sourcesPending}
                        label="Hybrid retrieval"
                        detail={view.passages ? `${view.passages.length} passages` : undefined}
                      />
                      <Stage done={false} active={!view.sourcesPending} label="Claude writing answer" />
                      <span className="ml-auto text-[12px] text-muted">
                        <Elapsed since={run.startedAt} />
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-[92%]" />
                      <Skeleton className="h-4 w-[85%]" />
                      <Skeleton className="h-4 w-[88%]" />
                      <Skeleton className="h-4 w-[60%]" />
                    </div>
                  </div>
                ) : view.askError ? (
                  <Notice kind="error" title="The request failed">
                    {view.askError.message}
                  </Notice>
                ) : r ? (
                  <>
                    {answerKind === 'llm_error' ? (
                      <Notice kind="error" title="Claude synthesis failed">
                        The API returned 200, but the answer is an error message. Retrieval still worked: the sources on the right are what Claude would have seen.
                      </Notice>
                    ) : answerKind === 'no_llm' ? (
                      <Notice kind="warn" title="Retrieval-only mode">
                        ANTHROPIC_API_KEY isn't set on the API, so you get the retrieved passages without a written answer.
                      </Notice>
                    ) : null}
                    <Answer text={r.answer} lookup={lookup} onSelect={selectCitation} />
                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[12px] text-fg-2">
                      <StatusPill kind="idle" label={`as of ${formatDate(r.as_of)}`} />
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5">
                        <Clock className="size-3.5 text-muted" />
                        <span className="tabular">{formatMs(r.latency_ms)}</span>
                      </span>
                      <span className="rounded-full border border-line px-2 py-0.5">
                        {r.citations.length} of {view.passages?.length ?? view.limit} passages cited
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-line py-0.5 pl-2 pr-0.5 font-mono text-[11px]">
                        snapshot {r.snapshot_id.slice(0, 12)}…
                        <CopyButton value={r.snapshot_id} label="Copy snapshot id" />
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => submit(view.question, view.limit)}>
                          <RefreshCw /> Ask again
                        </Button>
                        <Link
                          to={`/lab?q=${encodeURIComponent(view.question)}`}
                          className="inline-flex h-8 items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-fg-2 hover:bg-surface-2 hover:text-fg"
                        >
                          <FlaskConical className="size-4" /> Compare retrievers
                        </Link>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <div className="min-w-0">
              <div className="sticky top-6">
                <div className="mb-3 flex items-baseline justify-between px-1">
                  <h2 className="text-[13px] font-semibold">Sources</h2>
                  <span className="text-[11.5px] text-muted">hybrid top {view.limit}</span>
                </div>
                <div className="max-h-[calc(100vh-140px)] overflow-y-auto pb-4 pr-1">
                  <SourceList passages={view.passages} response={r} focused={focused} pending={view.sourcesPending} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen} title="Answer history" description="Saved in this browser. The snapshots themselves live in Postgres.">
        <div className="p-5">
          <HistoryList
            entries={history}
            activeId={saved?.id}
            onPick={(e) => {
              setSaved(e)
              setQuestion(e.question)
              setHistoryOpen(false)
            }}
          />
        </div>
      </Sheet>
    </div>
  )
}
