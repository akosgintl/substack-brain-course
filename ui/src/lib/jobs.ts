import { useQuery } from '@tanstack/react-query'
import { ApiError, api, type InngestRun, type JobStatus } from './api'
import { createStore } from './store'

/**
 * The API has no "list jobs" endpoint, so the UI remembers the event ids it
 * started (in this browser) and polls `GET /jobs/{event_id}` for each.
 */
export type JobKind = 'backfill' | 'article' | 'sync'

export interface TrackedJob {
  event_id: string
  kind: JobKind
  label: string
  trace_url: string
  created_at: number
  priority_offset_s?: number
}

export const jobsStore = createStore<TrackedJob[]>('kb.jobs', [])

export function trackJob(job: TrackedJob) {
  jobsStore.set((prev) => [job, ...prev.filter((j) => j.event_id !== job.event_id)].slice(0, 40))
}

export function forgetJob(eventId: string) {
  jobsStore.set((prev) => prev.filter((j) => j.event_id !== eventId))
}

export type JobPhase = 'waiting' | 'running' | 'completed' | 'failed' | 'missing'

export interface JobView {
  phase: JobPhase
  status?: JobStatus
  error?: string
}

const TERMINAL_RUN = new Set(['Completed', 'Failed', 'Cancelled'])
// Inngest can take a moment to record the run behind a fresh event.
const GRACE_MS = 2 * 60_000
const POLL_MS = 2_000
const GIVE_UP_MS = 45 * 60_000

function phaseOf(job: TrackedJob, s: JobStatus): JobPhase {
  if (s.run_status === 'Failed' || s.run_status === 'Cancelled') return 'failed'
  if (job.kind === 'backfill') {
    // The discovery run finishes long before its articles do; the jobs row
    // flips to "completed" once every discovered article has landed.
    return s.status === 'completed' ? 'completed' : 'running'
  }
  if (s.run_status && TERMINAL_RUN.has(s.run_status)) return 'completed'
  return s.run_status ? 'running' : 'waiting'
}

export const isDone = (p: JobPhase) => p === 'completed' || p === 'failed' || p === 'missing'

export function useJob(job: TrackedJob) {
  return useQuery<JobView>({
    queryKey: ['job', job.event_id],
    queryFn: async () => {
      try {
        const status = await api.job(job.event_id)
        return { phase: phaseOf(job, status), status }
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          return { phase: Date.now() - job.created_at < GRACE_MS ? 'waiting' : 'missing' }
        }
        throw e
      }
    },
    refetchInterval: (q) => {
      const phase = q.state.data?.phase
      if (phase && isDone(phase)) return false
      return Date.now() - job.created_at > GIVE_UP_MS ? false : POLL_MS
    },
  })
}

/** The run's own output (e.g. `{discovered: 12}` or `{status: "unchanged"}`), straight from Inngest. */
export function useJobRuns(job: TrackedJob, active: boolean) {
  return useQuery<InngestRun[]>({
    queryKey: ['runs', job.event_id],
    queryFn: async () => (await api.runs(job.event_id)).data ?? [],
    refetchInterval: active ? POLL_MS * 2 : false,
    retry: false,
  })
}
