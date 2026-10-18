import { Radio } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEvents } from '@/hooks/queries'
import type { InngestEvent } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { EmptyState, Skeleton } from './ui/misc'

function describe(e: InngestEvent): string {
  const d = e.data ?? {}
  const pick = (k: string) => (typeof d[k] === 'string' || typeof d[k] === 'number' ? String(d[k]) : null)
  const bits = [pick('canonical_id') ?? pick('url') ?? pick('feed_url') ?? pick('snapshot_id') ?? pick('function_id')]
  if (pick('passage_count')) bits.push(`${pick('passage_count')} passages`)
  return bits.filter(Boolean).join(' · ') || JSON.stringify(d).slice(0, 90)
}

/** Recent events, read from the Inngest dev server's REST API. */
export function EventFeed({ limit = 14 }: { limit?: number }) {
  const q = useEvents(30)
  if (q.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    )
  }
  if (q.isError) {
    return (
      <EmptyState icon={<Radio />} title="Inngest dev server unreachable">
        {q.error.message}
      </EmptyState>
    )
  }
  const events = q.data.slice(0, limit)
  if (!events.length) return <EmptyState icon={<Radio />} title="No events yet" />
  return (
    <ul className="space-y-1">
      <AnimatePresence initial={false}>
        {events.map((e) => (
          <motion.li
            key={e.internal_id ?? e.id}
            layout
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2"
          >
            <span className="shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-fg">
              {e.name}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">{describe(e)}</span>
            <span className="tabular shrink-0 text-[11px] text-muted">{timeAgo(e.ts)}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
