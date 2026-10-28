import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Fingerprint, History, ScanSearch, Tags } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { api, type SourceProvenance } from '@/lib/api'
import { useStore } from '@/lib/store'
import { inspectSource, uiStore } from '@/lib/ui-state'
import { formatDate, hostOf, isUuid } from '@/lib/utils'
import { ClaimNote } from './claim'
import { StatusPill } from './status'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { CopyButton, EmptyState, JsonView, Skeleton } from './ui/misc'
import { Sheet } from './ui/overlays'

function Section({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted [&_svg]:size-3.5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-[12.5px]">
      <span className="shrink-0 text-fg-2">{label}</span>
      <span className="flex min-w-0 justify-end truncate text-right">{children}</span>
    </div>
  )
}

function IdValue({ value }: { value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-0.5 font-mono text-[11.5px]">
      <span className="truncate">{value}</span>
      <CopyButton value={value} label="Copy" />
    </span>
  )
}

function Provenance({ p }: { p: SourceProvenance }) {
  const v = p.validity
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium capitalize">{p.kind}</span>
        <StatusPill kind={v.is_active ? 'ok' : 'warn'} label={v.is_active ? 'Active' : 'Superseded'} />
        {p.confidence != null ? (
          <span className="tabular rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-fg-2">
            confidence {p.confidence.toFixed(2)}
          </span>
        ) : null}
        {p.chunk_index != null ? (
          <span className="tabular rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-fg-2">chunk #{p.chunk_index}</span>
        ) : null}
      </div>

      {p.claim_text ? <ClaimNote text={p.claim_text} type={p.claim_type} clamp={false} className="py-2.5 pl-3.5" /> : null}

      <Section title={p.kind === 'claim' ? 'Verbatim quote' : 'Passage text'}>
        <blockquote className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2/50 p-3.5 text-[13px] leading-relaxed text-fg-2">
          {p.kind === 'claim' ? `“${p.verbatim_quote}”` : p.verbatim_quote}
        </blockquote>
        {p.kind === 'claim' ? (
          <p className="text-[11.5px] text-muted">Checked against the article text by the quote-span guardrail before the claim was stored.</p>
        ) : null}
      </Section>

      {p.topics?.length ? (
        <Section icon={<Tags />} title="Topics">
          <div className="flex flex-wrap gap-1.5">
            {p.topics.map((t) => (
              <span key={t.slug} title={t.slug} className="rounded-full border border-graph/30 bg-graph/10 px-2 py-0.5 text-[11.5px]">
                {t.name}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      <Section icon={<History />} title="Temporal validity">
        <div className="divide-y divide-line rounded-xl border border-line px-3.5 py-1">
          <Row label="Valid from">{formatDate(v.valid_from)}</Row>
          <Row label="Valid to">{v.valid_to ? formatDate(v.valid_to) : <span className="text-muted">open, still current</span>}</Row>
          <Row label="Supersedes">
            {v.supersedes_id ? (
              <button
                type="button"
                onClick={() => inspectSource(v.supersedes_id!)}
                className="cursor-pointer font-mono text-[11.5px] text-accent hover:underline"
              >
                {v.supersedes_id}
              </button>
            ) : (
              <span className="text-muted">nothing</span>
            )}
          </Row>
        </div>
      </Section>

      <Section icon={<Fingerprint />} title="Provenance">
        <div className="rounded-xl border border-line p-3.5">
          <a href={p.article.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-[13.5px] font-semibold leading-snug hover:text-accent">
            {p.article.title} <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
          </a>
          <p className="mt-1 text-[12px] text-muted">
            {p.author} · {formatDate(p.article.published_at)} ·{' '}
            <a href={p.publication.homepage} target="_blank" rel="noreferrer" className="hover:text-fg">
              {p.publication.name} ({hostOf(p.publication.homepage)})
            </a>
          </p>
          <div className="mt-3 divide-y divide-line border-t border-line">
            <Row label={p.kind === 'claim' ? 'claim_id' : 'passage_id'}>
              <IdValue value={p.id} />
            </Row>
            <Row label="article_id">
              <IdValue value={p.article.article_id} />
            </Row>
            <Row label="canonical_id">
              <IdValue value={p.article.canonical_id} />
            </Row>
            <Row label="content_hash">
              <IdValue value={p.article.content_hash} />
            </Row>
          </div>
        </div>
      </Section>

      <Section title="Raw response">
        <JsonView value={p} className="max-h-72" />
      </Section>
    </div>
  )
}

/** Sheet for `GET /sources/{claim_or_passage_id}`, opened from any citation or search hit. */
export function SourceInspector() {
  const { source: id } = useStore(uiStore)
  const [draft, setDraft] = useState('')
  useEffect(() => setDraft(id ?? ''), [id])

  const q = useQuery({
    queryKey: ['source', id],
    queryFn: () => api.source(id!),
    enabled: !!id,
    staleTime: 60_000,
    retry: false,
  })

  const lookup = () => isUuid(draft) && inspectSource(draft.trim())

  return (
    <Sheet
      open={!!id}
      onOpenChange={(o) => !o && uiStore.set((s) => ({ ...s, source: null }))}
      title="Source provenance"
      description="GET /sources/{id}: verbatim quote, author, publication and temporal validity for a claim or passage."
      className="max-w-[min(560px,100vw)]"
    >
      <div className="space-y-5 p-5">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup()}
            placeholder="claim_id or passage_id (UUID)"
            className="font-mono text-[12.5px]"
          />
          <Button onClick={lookup} disabled={!isUuid(draft) || draft.trim() === id}>
            <ScanSearch /> Look up
          </Button>
        </div>
        {q.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-28" />
            <Skeleton className="h-24" />
            <Skeleton className="h-32" />
          </div>
        ) : q.isError ? (
          <EmptyState icon={<ScanSearch />} title="Lookup failed">
            {q.error.message}
          </EmptyState>
        ) : q.data ? (
          <Provenance p={q.data} />
        ) : null}
      </div>
    </Sheet>
  )
}
