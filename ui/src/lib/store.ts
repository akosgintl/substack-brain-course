import { useSyncExternalStore } from 'react'

/**
 * A tiny external store, optionally persisted to localStorage. Storage can be
 * missing or throw (private windows, blocked site data), so every access is
 * guarded and the app works the same without it, just without memory.
 */
export interface Store<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(key: string | null, initial: T): Store<T> {
  let state = initial
  if (key) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) state = JSON.parse(raw) as T
    } catch {
      /* keep the initial value */
    }
  }
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set: (next) => {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(state))
        } catch {
          /* quota or blocked storage: keep it in memory only */
        }
      }
      for (const l of listeners) l()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
