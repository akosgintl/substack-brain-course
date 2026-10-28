import { useQuery } from '@tanstack/react-query'
import { api, type SnapshotEval } from '@/lib/api'
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

export function useEvalReport(limit = 10) {
  return useQuery({
    queryKey: ['evals', limit],
    queryFn: () => api.evalReport(limit),
    refetchInterval: 10_000,
    retry: false,
  })
}

// evaluate-answer runs two LLM judges after /ask returns; give it a while.
const SNAPSHOT_EVAL_GIVE_UP_MS = 3 * 60_000

/**
 * The evaluate-answer verdict for one snapshot. There is no per-snapshot endpoint,
 * so this looks for it among the 50 most recent evaluations and stops polling once
 * it's found, or after a few minutes (no API key, judges failing, or it fell out
 * of the window).
 */
export function useSnapshotEval(snapshotId: string | undefined, askedAt: number) {
  return useQuery<SnapshotEval | null>({
    queryKey: ['snapshot-eval', snapshotId],
    enabled: !!snapshotId,
    queryFn: async () =>
      (await api.evalReport(50)).recent_evaluations.find((e) => e.snapshot_id === snapshotId) ?? null,
    refetchInterval: (q) =>
      q.state.data || Date.now() - askedAt > SNAPSHOT_EVAL_GIVE_UP_MS ? false : 4_000,
    retry: false,
  })
}

/** "ok" or "error: <detail>" (kb/health.py) -> a status kind. */
export const subsystemKind = (v: string | undefined): StatusKind => (v === 'ok' ? 'ok' : v ? 'error' : 'idle')
