import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function timeAgo(value: string | number | Date): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const s = Math.round((then - Date.now()) / 1000)
  const abs = Math.abs(s)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day')
  return formatDate(value)
}

export function formatDate(value: string | number | Date): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const formatNumber = (n: number) => n.toLocaleString('en')

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}s` : `${Math.round(ms)}ms`
}
