import { Check, Copy } from 'lucide-react'
import { type HTMLAttributes, type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Tip } from './overlays'

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-mono text-[10.5px] text-muted',
        className,
      )}
      {...props}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-lg', className)} />
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Tip content={copied ? 'Copied' : label}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          })
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </Tip>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <div className="mb-1 grid size-10 place-items-center rounded-xl border border-line bg-surface-2 text-muted [&_svg]:size-5">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      {children ? <div className="max-w-sm text-[13px] text-fg-2">{children}</div> : null}
    </div>
  )
}

/** Pretty-printed JSON with light token colouring. */
export function JsonView({ value, className }: { value: unknown; className?: string }) {
  const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  const html = (json ?? 'null')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(
      /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (m) => {
        let cls = 'text-[var(--eng-vector)]'
        if (m.startsWith('"')) cls = m.trimEnd().endsWith(':') ? 'text-fg' : 'text-good-text'
        else if (/true|false|null/.test(m)) cls = 'text-accent'
        return `<span class="${cls}">${m}</span>`
      },
    )
  return (
    <pre
      className={cn(
        'overflow-auto rounded-xl border border-line bg-surface-2/70 p-3 font-mono text-[11.5px] leading-relaxed text-fg-2',
        className,
      )}
      // Safe: the JSON is HTML-escaped above; only our own <span>s are injected.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
