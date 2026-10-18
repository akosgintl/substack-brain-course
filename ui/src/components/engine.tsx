import type { Engine } from '@/lib/api'
import { cn } from '@/lib/utils'

export const ENGINE: Record<Engine, { label: string; long: string; dot: string; ring: string; bar: string }> = {
  bm25: { label: 'BM25', long: 'Full-text (BM25)', dot: 'bg-bm25', ring: 'ring-bm25/50', bar: 'bg-bm25' },
  vector: { label: 'Vector', long: 'Vector (pgvector)', dot: 'bg-vector', ring: 'ring-vector/50', bar: 'bg-vector' },
  both: { label: 'Both', long: 'Found by both', dot: 'bg-both', ring: 'ring-both/50', bar: 'bg-both' },
}

export function EngineDot({ engine, className }: { engine: Engine; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', ENGINE[engine].dot, className)} />
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
      {ENGINE[engine].label}
    </span>
  )
}
