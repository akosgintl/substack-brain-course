import { ChevronRight, SquareTerminal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { type ActivityEntry, activity } from '@/lib/api'
import { links } from '@/lib/links'
import { useStore } from '@/lib/store'
import { uiStore } from '@/lib/ui-state'
import { cn, formatMs } from '@/lib/utils'
import { Button } from './ui/button'
import { CopyButton, EmptyState, JsonView } from './ui/misc'
import { Sheet } from './ui/overlays'

function curlOf(e: ActivityEntry): string {
  const base = e.target === 'api' ? links.api : links.inngest
  const parts = [`curl -s${e.method === 'GET' ? '' : ` -X ${e.method}`} '${base}${e.path}'`]
  if (e.request !== undefined) {
    parts.push(`-H 'Content-Type: application/json'`, `-d '${JSON.stringify(e.request).replace(/'/g, "'\\''")}'`)
  }
  return parts.join(' \\\n  ')
}

function statusClass(e: ActivityEntry) {
  if (e.status == null) return e.error ? 'text-critical' : 'text-muted'
  if (e.status < 300) return 'text-good-text'
  if (e.status < 500) return 'text-fg'
  return 'text-critical'
}

function Row({ e }: { e: ActivityEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2"
      >
        <ChevronRight className={cn('size-3.5 shrink-0 text-muted transition-transform', open && 'rotate-90')} />
        <span className={cn('w-10 shrink-0 font-mono text-[11px] font-semibold', e.method === 'POST' ? 'text-accent' : 'text-fg-2')}>
          {e.method}
        </span>
        <span className="shrink-0 rounded border border-line px-1 font-mono text-[10px] text-muted">{e.target}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{e.path}</span>
        <span className={cn('tabular w-9 shrink-0 text-right font-mono text-[11.5px] font-semibold', statusClass(e))}>
          {e.status ?? (e.error ? 'ERR' : '…')}
        </span>
        <span className="tabular w-14 shrink-0 text-right font-mono text-[11px] text-muted">{e.ms != null ? formatMs(e.ms) : ''}</span>
      </button>
      {open ? (
        <div className="space-y-3 px-5 pb-4 pl-11">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">curl</p>
              <CopyButton value={curlOf(e)} label="Copy as curl" />
            </div>
            <JsonView value={curlOf(e)} />
          </div>
          {e.request !== undefined ? (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Request body</p>
              <JsonView value={e.request} className="max-h-48" />
            </div>
          ) : null}
          {e.error ? <p className="text-[12px] text-critical">{e.error}</p> : null}
          {e.response !== undefined ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Response</p>
                <CopyButton value={JSON.stringify(e.response, null, 2)} label="Copy response" />
              </div>
              <JsonView value={e.response} className="max-h-96" />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

/** Every request the UI has made: method, status, timing, payloads, and a curl to replay it. */
export function ApiConsole() {
  const { console: open } = useStore(uiStore)
  const entries = useStore(activity)
  const [showPolling, setShowPolling] = useState(false)
  const visible = showPolling ? entries : entries.filter((e) => !e.background)
  const hidden = entries.length - visible.length

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => uiStore.set((s) => ({ ...s, console: o }))}
      title="API console"
      description="Requests to FastAPI (/api → :8000) and the Inngest dev server (/inngest → :8288), newest first."
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-fg-2">
          <input type="checkbox" checked={showPolling} onChange={(e) => setShowPolling(e.target.checked)} className="accent-[var(--accent)]" />
          Show background polling {hidden > 0 && !showPolling ? <span className="text-muted">({hidden} hidden)</span> : null}
        </label>
        <Button variant="ghost" size="sm" onClick={() => activity.set([])}>
          <Trash2 /> Clear
        </Button>
      </div>
      {visible.length ? (
        <ul>
          {visible.map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<SquareTerminal />} title="No requests yet">
          Run a search or ask a question and each call shows up here with its payload.
        </EmptyState>
      )}
    </Sheet>
  )
}
