import { MessageCircle, Ruler, Telescope } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE: Record<string, { icon: typeof Ruler; label: string }> = {
  opinion: { icon: MessageCircle, label: 'Opinion' },
  measurement: { icon: Ruler, label: 'Measurement' },
  prediction: { icon: Telescope, label: 'Prediction' },
}

/** The epistemic type the extractor gave a claim (kb/schemas/entities.py). */
export function ClaimTypeBadge({ type, className }: { type: string | null | undefined; className?: string }) {
  const t = TYPE[type ?? ''] ?? { icon: MessageCircle, label: type || 'Claim' }
  const Icon = t.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-graph/30 bg-graph/10 px-2 py-0.5 text-[11px] font-medium text-fg',
        className,
      )}
    >
      <Icon className="size-3 text-graph" />
      {t.label}
    </span>
  )
}

/** The attributed claim the graph matched, shown above the passage it lives in. */
export function ClaimNote({
  text,
  type,
  clamp = true,
  className,
}: {
  text: string
  type: string | null | undefined
  clamp?: boolean
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border-l-2 border-graph bg-graph/5 py-1.5 pl-2.5 pr-2', className)}>
      <ClaimTypeBadge type={type} className="border-0 bg-transparent px-0 py-0" />
      <p className={cn('mt-0.5 text-[12px] leading-relaxed text-fg', clamp && 'line-clamp-3')}>{text}</p>
    </div>
  )
}
