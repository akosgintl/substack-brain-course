import { useEffect } from 'react'
import { createStore, useStore } from './store'

export type ThemePref = 'system' | 'light' | 'dark'

export const themeStore = createStore<ThemePref>('kb.theme', 'system')

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  return media().matches ? 'dark' : 'light'
}

export function cycleTheme() {
  const order: ThemePref[] = ['system', 'light', 'dark']
  themeStore.set((t) => order[(order.indexOf(t) + 1) % order.length])
}

/** Applies the preference to <html data-theme> and follows the OS while on "system". */
export function useTheme() {
  const pref = useStore(themeStore)
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(pref)
    }
    apply()
    if (pref !== 'system') return
    const m = media()
    m.addEventListener('change', apply)
    return () => m.removeEventListener('change', apply)
  }, [pref])
  return { pref, resolved: resolveTheme(pref) }
}
