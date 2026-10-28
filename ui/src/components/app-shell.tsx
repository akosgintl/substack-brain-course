import {
  ArrowUpRight,
  Brain,
  Download,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
  Monitor,
  Moon,
  Search,
  SquareTerminal,
  Sun,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { subsystemKind, useHealth } from '@/hooks/queries'
import { activity } from '@/lib/api'
import { links } from '@/lib/links'
import { useStore } from '@/lib/store'
import { cycleTheme, type ThemePref } from '@/lib/theme'
import { openConsole, openPalette } from '@/lib/ui-state'
import { cn, formatNumber } from '@/lib/utils'
import { StatusDot } from './status'
import { Kbd } from './ui/misc'
import { Tip } from './ui/overlays'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/ask', label: 'Ask', icon: MessageSquareText },
  { to: '/lab', label: 'Search Lab', icon: FlaskConical },
  { to: '/evals', label: 'Evals', icon: Gauge },
  { to: '/ingest', label: 'Ingest & jobs', icon: Download },
]

const THEME_ICON: Record<ThemePref, typeof Sun> = { system: Monitor, light: Sun, dark: Moon }

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-[10px] bg-[linear-gradient(135deg,var(--accent),var(--eng-vector))] text-white shadow-[0_6px_20px_-6px_var(--accent)]">
        <Brain className="size-4.5" />
      </div>
      <div className="leading-tight">
        <p className="text-[14px] font-semibold tracking-tight">Substack Brain</p>
        <p className="font-mono text-[10.5px] text-muted">console · localhost</p>
      </div>
    </div>
  )
}

function HealthCard() {
  const q = useHealth()
  const h = q.data
  const rows = [
    { label: 'API', kind: q.isError ? 'error' : h ? 'ok' : 'idle' },
    { label: 'Postgres', kind: subsystemKind(h?.database) },
    { label: 'Inngest', kind: subsystemKind(h?.inngest) },
    { label: 'Memgraph', kind: subsystemKind(h?.memgraph) },
  ] as const
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 p-3">
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[12px]">
            <span className="text-fg-2">{r.label}</span>
            <span className="flex items-center gap-2 text-[11px] text-muted">
              {r.kind === 'ok' ? 'up' : r.kind === 'error' ? 'down' : '…'}
              <StatusDot kind={r.kind} />
            </span>
          </div>
        ))}
      </div>
      {h ? (
        <p className="tabular mt-2.5 border-t border-line pt-2 font-mono text-[11px] text-muted">
          {formatNumber(h.articles)} articles · {formatNumber(h.passages)} passages
          {h.claims != null ? ` · ${formatNumber(h.claims)} claims` : ''}
        </p>
      ) : null}
    </div>
  )
}

function ToolButton({ icon, label, onClick, badge }: { icon: ReactNode; label: string; onClick: () => void; badge?: number }) {
  return (
    <Tip content={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="relative grid size-8 cursor-pointer place-items-center rounded-lg text-fg-2 hover:bg-surface-2 hover:text-fg [&_svg]:size-4"
      >
        {icon}
        {badge ? (
          <span className="tabular absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-[9.5px] font-semibold leading-4 text-accent-fg">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </button>
    </Tip>
  )
}

export function AppShell({ theme, children }: { theme: ThemePref; children: ReactNode }) {
  const requests = useStore(activity).filter((e) => !e.background).length
  const ThemeIcon = THEME_ICON[theme]

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[252px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/50 px-4 py-5 backdrop-blur-xl lg:flex">
        <Brand />
        <button
          type="button"
          onClick={openPalette}
          className="mt-6 flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-fg-2"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Ask or run…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <nav className="mt-5 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors',
                  isActive ? 'bg-accent-soft text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" /> : null}
                  <Icon className={cn('size-4', isActive ? 'text-accent' : 'text-muted')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 space-y-0.5">
          <p className="px-3 pb-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">Tools</p>
          {[
            { href: links.inngest, label: 'Inngest dev server' },
            { href: links.swagger, label: 'Swagger UI' },
            { href: links.adminer, label: 'Adminer' },
            { href: links.memgraphLab, label: 'Memgraph Lab' },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg"
            >
              {l.label} <ArrowUpRight className="size-3.5 text-muted" />
            </a>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          <HealthCard />
          <div className="flex items-center justify-between px-1">
            <ToolButton icon={<SquareTerminal />} label="API console" onClick={openConsole} badge={requests} />
            <ToolButton icon={<ThemeIcon />} label={`Theme: ${theme}`} onClick={cycleTheme} />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <ToolButton icon={<Search />} label="Command palette" onClick={openPalette} />
          <ToolButton icon={<SquareTerminal />} label="API console" onClick={openConsole} badge={requests} />
          <ToolButton icon={<ThemeIcon />} label={`Theme: ${theme}`} onClick={cycleTheme} />
        </div>
      </header>
      <nav className="sticky top-[61px] z-20 flex gap-1 overflow-x-auto border-b border-line bg-bg/80 px-4 py-2 backdrop-blur-xl lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium',
                isActive ? 'bg-accent-soft text-fg' : 'text-fg-2',
              )
            }
          >
            <Icon className="size-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  )
}
