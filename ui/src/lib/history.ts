import type { AskResponse, Hit } from './api'
import { createStore } from './store'

/** Answers asked from this browser. Snapshots live in Postgres, but no endpoint reads them back. */
export interface AskEntry {
  id: string
  question: string
  limit: number
  at: number
  response: AskResponse
  passages: Hit[] | null
}

export const historyStore = createStore<AskEntry[]>('kb.asks', [])

export function saveAsk(entry: AskEntry) {
  historyStore.set((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, 40))
}

export function deleteAsk(id: string) {
  historyStore.set((prev) => prev.filter((e) => e.id !== id))
}
