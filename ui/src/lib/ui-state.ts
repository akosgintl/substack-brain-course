import { createStore } from './store'

export const uiStore = createStore<{ console: boolean; palette: boolean }>(null, { console: false, palette: false })

export const openConsole = () => uiStore.set((s) => ({ ...s, console: true }))
export const openPalette = () => uiStore.set((s) => ({ ...s, palette: true }))
