import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StatusKind } from '@/components/status'

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => api.health(), refetchInterval: 10_000, retry: false })
}

export function useEvents(limit = 30) {
  return useQuery({
    queryKey: ['events', limit],
    queryFn: async () => (await api.events(limit)).data ?? [],
    refetchInterval: 5_000,
    retry: false,
  })
}

/** "ok" or "error: <detail>" (kb/health.py) -> a status kind. */
export const subsystemKind = (v: string | undefined): StatusKind => (v === 'ok' ? 'ok' : v ? 'error' : 'idle')
