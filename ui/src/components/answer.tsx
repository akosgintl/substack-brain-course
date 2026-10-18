import { type ReactNode, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Hit } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Hover } from './ui/overlays'
import { PassagePreview } from './passage'

// "[1]", "[1, 2]", "[1][3]", but never a markdown link "[text](url)".
const CITE_RE = /\[(\d{1,2}(?:\s*[,;]\s*\d{1,2})*)\](?!\()/g

export function linkifyCitations(md: string): string {
  return md.replace(CITE_RE, (_, nums: string) =>
    nums
      .split(/[,;]/)
      .map((n) => `[${n.trim()}](#cite-${n.trim()})`)
      .join(''),
  )
}

export type SourceLookup = (index: number) => (Partial<Hit> & Pick<Hit, 'title' | 'url' | 'text' | 'author' | 'published_at'>) | undefined

function CitationChip({ n, lookup, onSelect }: { n: number; lookup: SourceLookup; onSelect?: (n: number) => void }) {
  const source = lookup(n)
  const chip = (
    <button
      type="button"
      data-cite
      onClick={() => onSelect?.(n)}
      className={cn(
        'mx-0.5 inline-flex h-[1.35em] min-w-[1.35em] -translate-y-[1px] cursor-pointer items-center justify-center rounded-md px-1 align-middle font-mono text-[0.72em] font-semibold transition-colors',
        source
          ? 'bg-accent-soft text-fg ring-1 ring-accent/30 hover:bg-accent hover:text-accent-fg'
          : 'bg-surface-2 text-muted ring-1 ring-line',
      )}
    >
      {n}
    </button>
  )
  if (!source) return chip
  return (
    <Hover trigger={chip}>
      <PassagePreview hit={source} index={n} />
    </Hover>
  )
}

export function Answer({ text, lookup, onSelect }: { text: string; lookup: SourceLookup; onSelect?: (n: number) => void }) {
  const md = useMemo(() => linkifyCitations(text), [text])
  return (
    <div className="prose-answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const m = href?.match(/^#cite-(\d+)$/)
            if (m) return <CitationChip n={Number(m[1])} lookup={lookup} onSelect={onSelect} />
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children as ReactNode}
              </a>
            )
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  )
}
