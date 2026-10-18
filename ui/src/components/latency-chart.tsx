import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AskEntry } from '@/lib/history'
import { formatMs } from '@/lib/utils'

interface Row {
  i: number
  ms: number
  question: string
}

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = active ? payload?.[0]?.payload : undefined
  if (!row) return null
  return (
    <div className="max-w-64 rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="tabular font-semibold text-fg">{formatMs(row.ms)}</p>
      <p className="mt-0.5 line-clamp-2 text-fg-2">{row.question}</p>
    </div>
  )
}

/** One series (answer latency per ask, oldest -> newest), so no legend: the card title names it. */
export function LatencyChart({ entries }: { entries: AskEntry[] }) {
  const rows: Row[] = entries
    .slice(0, 20)
    .reverse()
    .map((e, i) => ({ i: i + 1, ms: e.response.latency_ms, question: e.question }))
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="i" tick={false} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} height={6} />
          <YAxis
            tickFormatter={(v: number) => formatMs(v)}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<TooltipBody />} cursor={{ fill: 'var(--accent-soft)' }} />
          <Bar dataKey="ms" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
