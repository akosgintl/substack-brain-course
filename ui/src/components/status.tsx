import { CircleAlert, CircleCheck, CircleDashed, CircleX, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusKind = 'ok' | 'warn' | 'error' | 'running' | 'idle'

const STYLE: Record<StatusKind, { icon: typeof CircleCheck; cls: string }> = {
  ok: { icon: CircleCheck, cls: 'text-good-text border-good/25 bg-good/10' },
  warn: { icon: CircleAlert, cls: 'text-fg border-warning/35 bg-warning/10 [&_svg]:text-warning' },
  error: { icon: CircleX, cls: 'text-critical border-critical/30 bg-critical/10' },
  running: { icon: LoaderCircle, cls: 'text-fg border-accent/30 bg-accent-soft [&_svg]:animate-spin [&_svg]:text-accent' },
  idle: { icon: CircleDashed, cls: 'text-fg-2 border-line bg-surface-2' },
}

/** Status = icon + label + colour, so state never rides on colour alone. */
export function StatusPill({ kind, label, className }: { kind: StatusKind; label: string; className?: string }) {
  const { icon: Icon, cls } = STYLE[kind]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium', cls, className)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}

export function StatusDot({ kind }: { kind: StatusKind }) {
  const color = { ok: 'bg-good', warn: 'bg-warning', error: 'bg-critical', running: 'bg-accent', idle: 'bg-muted' }[kind]
  return (
    <span className="relative flex size-2.5">
      {kind === 'ok' || kind === 'running' ? (
        <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-40', color)} />
      ) : null}
      <span className={cn('relative inline-flex size-2.5 rounded-full', color)} />
    </span>
  )
}
