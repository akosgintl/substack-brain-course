import { createStore } from './store'

export const uiStore = createStore<{ console: boolean; palette: boolean; source: string | null }>(null, {
  console: false,
  palette: false,
  source: null,
})

export const openConsole = () => uiStore.set((s) => ({ ...s, console: true }))
export const openPalette = () => uiStore.set((s) => ({ ...s, palette: true }))
/** Open the provenance sheet (`GET /sources/{id}`) for a claim_id or passage_id. */
export const inspectSource = (id: string) => uiStore.set((s) => ({ ...s, source: id }))
