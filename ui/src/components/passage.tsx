import { ArrowUpRight } from 'lucide-react'
import type { Hit } from '@/lib/api'
import { formatDate, hostOf } from '@/lib/utils'
import { EngineBadge } from './engine'

/** What a passage looks like inside hover cards and source lists. */
export function PassagePreview({ hit, index }: { hit: Pick<Hit, 'title' | 'author' | 'url' | 'published_at' | 'text'> & Partial<Hit>; index?: number }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2">
        {index != null ? (
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-accent-soft font-mono text-[11px] font-semibold text-fg">
            {index}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold leading-snug">{hit.title}</p>
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {hit.author ?? 'Unknown author'} · {formatDate(hit.published_at)} · {hostOf(hit.url)}
          </p>
        </div>
      </div>
      {hit.text ? <p className="line-clamp-[8] text-[12.5px] leading-relaxed text-fg-2">{hit.text}</p> : null}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {hit.engine ? <EngineBadge engine={hit.engine} /> : null}
        {hit.sparse_rank != null ? <RankChip label="BM25" rank={hit.sparse_rank} /> : null}
        {hit.dense_rank != null ? <RankChip label="Vector" rank={hit.dense_rank} /> : null}
        <a
          href={hit.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
        >
          Open article <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

export function RankChip({ label, rank }: { label: string; rank: number }) {
  return (
    <span className="tabular rounded-md border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-fg-2">
      {label} #{rank}
    </span>
  )
}
