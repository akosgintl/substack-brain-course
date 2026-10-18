import { Command } from 'cmdk'
import {
  ArrowUpRight,
  Download,
  FlaskConical,
  LayoutDashboard,
  MessageSquareText,
  Monitor,
  Rss,
  SquareTerminal,
  Workflow,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { type ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startBackfill, startBackfillAll, syncNow } from '@/lib/actions'
import { publications } from '@/lib/allowlist'
import { links } from '@/lib/links'
import { useStore } from '@/lib/store'
import { cycleTheme } from '@/lib/theme'
import { openConsole, uiStore } from '@/lib/ui-state'
import { Kbd } from './ui/misc'

function Item({ icon, children, onSelect, hint, forceMount, value, keywords }: { icon: ReactNode; children: ReactNode; onSelect: () => void; hint?: string; forceMount?: boolean; value?: string; keywords?: string[] }) {
  return (
    <Command.Item
      onSelect={onSelect}
      forceMount={forceMount}
      value={value}
      keywords={keywords}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-fg [&_svg]:size-4 [&_svg]:text-muted"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </Command.Item>
  )
}

const groupCls =
  'px-2 pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted'

export function CommandPalette() {
  const { palette: open } = useStore(uiStore)
  const setOpen = (o: boolean) => uiStore.set((s) => ({ ...s, palette: o }))
  const [text, setText] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        uiStore.set((s) => ({ ...s, palette: !s.palette }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const run = (fn: () => void) => () => {
    setOpen(false)
    setText('')
    fn()
  }
  const q = text.trim()
  const ignore = () => {} // toasts already report failures

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-[14vh] z-50 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/30 outline-none">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">Navigate, ask, search or trigger pipeline actions</Dialog.Description>
          <Command loop>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Command.Input
                value={text}
                onValueChange={setText}
                placeholder="Ask, search, or run a command…"
                className="h-13 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[min(440px,60vh)] overflow-y-auto pb-2">
              <Command.Empty className="px-4 py-8 text-center text-[13px] text-muted">No matching command.</Command.Empty>
              {q ? (
                <Command.Group heading="Query" className={groupCls} forceMount>
                  <Item forceMount value="query-ask" keywords={[q]} icon={<MessageSquareText />} hint="POST /ask" onSelect={run(() => navigate(`/ask?q=${encodeURIComponent(q)}`, { state: { autorun: true } }))}>
                    Ask “{q}”
                  </Item>
                  <Item forceMount value="query-lab" keywords={[q]} icon={<FlaskConical />} hint="GET /search ×3" onSelect={run(() => navigate(`/lab?q=${encodeURIComponent(q)}`))}>
                    Compare retrievers for “{q}”
                  </Item>
                </Command.Group>
              ) : null}
              <Command.Group heading="Go to" className={groupCls}>
                <Item icon={<LayoutDashboard />} onSelect={run(() => navigate('/'))}>Overview</Item>
                <Item icon={<MessageSquareText />} onSelect={run(() => navigate('/ask'))}>Ask</Item>
                <Item icon={<FlaskConical />} onSelect={run(() => navigate('/lab'))}>Search Lab</Item>
                <Item icon={<Download />} onSelect={run(() => navigate('/ingest'))}>Ingest &amp; jobs</Item>
              </Command.Group>
              <Command.Group heading="Pipeline" className={groupCls}>
                <Item icon={<Rss />} hint="kb/feed.poll" onSelect={run(() => syncNow().catch(ignore))}>Run freshness poll now</Item>
                <Item icon={<Workflow />} hint="POST /publications ×all" onSelect={run(() => startBackfillAll().catch(ignore))}>Backfill all publications</Item>
                {publications.map((p) => (
                  <Item key={p.slug} icon={<Workflow />} hint={p.slug} onSelect={run(() => startBackfill(p).catch(ignore))}>
                    Backfill {p.name}
                  </Item>
                ))}
              </Command.Group>
              <Command.Group heading="Tools" className={groupCls}>
                <Item icon={<SquareTerminal />} onSelect={run(openConsole)}>Open API console</Item>
                <Item icon={<Monitor />} onSelect={run(cycleTheme)}>Cycle theme (system / light / dark)</Item>
                <Item icon={<ArrowUpRight />} hint=":8288" onSelect={run(() => window.open(links.inngest, '_blank'))}>Open Inngest dev server</Item>
                <Item icon={<ArrowUpRight />} hint="/docs" onSelect={run(() => window.open(links.swagger, '_blank'))}>Open Swagger UI</Item>
                <Item icon={<ArrowUpRight />} hint=":8081" onSelect={run(() => window.open(links.adminer, '_blank'))}>Open Adminer</Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
