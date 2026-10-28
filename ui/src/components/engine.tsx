import type { Engine } from '@/lib/api'
import { cn } from '@/lib/utils'

/* Combinations with the graph are drawn as split swatches of their engines, so
 * "BM25 + Graph" reads as both colours; "both" (BM25 + vector) keeps its own
 * colour from week 2. */
export const ENGINE: Record<Engine, { label: string; long: string; dot: string; bar: string }> = {
  bm25: { label: 'BM25', long: 'Full-text (BM25)', dot: 'bg-bm25', bar: 'bg-bm25' },
  vector: { label: 'Vector', long: 'Vector (pgvector)', dot: 'bg-vector', bar: 'bg-vector' },
  both: { label: 'Both', long: 'BM25 + vector', dot: 'bg-both', bar: 'bg-both' },
  graph: { label: 'Graph', long: 'Claim graph (Memgraph)', dot: 'bg-graph', bar: 'bg-graph' },
  'bm25+graph': {
    label: 'BM25 + Graph',
    long: 'BM25 + claim graph',
    dot: 'bg-[linear-gradient(90deg,var(--eng-bm25)_50%,var(--eng-graph)_50%)]',
    bar: 'bg-[linear-gradient(90deg,var(--eng-bm25),var(--eng-graph))]',
  },
  'vector+graph': {
    label: 'Vector + Graph',
    long: 'Vector + claim graph',
    dot: 'bg-[linear-gradient(90deg,var(--eng-vector)_50%,var(--eng-graph)_50%)]',
    bar: 'bg-[linear-gradient(90deg,var(--eng-vector),var(--eng-graph))]',
  },
  all: {
    label: 'All three',
    long: 'BM25 + vector + claim graph',
    dot: 'bg-[conic-gradient(var(--eng-bm25)_0_33.3%,var(--eng-vector)_0_66.6%,var(--eng-graph)_0)]',
    bar: 'bg-[linear-gradient(90deg,var(--eng-bm25),var(--eng-vector),var(--eng-graph))]',
  },
}

export function EngineDot({ engine, className }: { engine: Engine; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', (ENGINE[engine] ?? ENGINE.bm25).dot, className)} />
}

/** Colour always travels with its text label, never alone. */
export function EngineBadge({ engine, className }: { engine: Engine; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-2',
        className,
      )}
    >
      <EngineDot engine={engine} />
      {(ENGINE[engine] ?? { label: engine }).label}
    </span>
  )
}
