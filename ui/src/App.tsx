import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ApiConsole } from './components/api-console'
import { AppShell } from './components/app-shell'
import { CommandPalette } from './components/command-palette'
import { TooltipProvider } from './components/ui/overlays'
import { useTheme } from './lib/theme'

// One chunk per page: recharts, markdown and the lab load only where used.
const OverviewPage = lazy(() => import('./pages/overview').then((m) => ({ default: m.OverviewPage })))
const AskPage = lazy(() => import('./pages/ask').then((m) => ({ default: m.AskPage })))
const SearchLabPage = lazy(() => import('./pages/search-lab').then((m) => ({ default: m.SearchLabPage })))
const IngestPage = lazy(() => import('./pages/ingest').then((m) => ({ default: m.IngestPage })))

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

function Routed() {
  const location = useLocation()
  return (
    <Suspense fallback={null}>
    <Routes location={location}>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/ask" element={<AskPage />} />
      <Route path="/lab" element={<SearchLabPage />} />
      <Route path="/ingest" element={<IngestPage />} />
      <Route path="*" element={<OverviewPage />} />
    </Routes>
    </Suspense>
  )
}

export function App() {
  const { pref, resolved } = useTheme()
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppShell theme={pref}>
            <Routed />
          </AppShell>
          <CommandPalette />
          <ApiConsole />
          <Toaster
            theme={resolved}
            position="bottom-right"
            toastOptions={{
              className: '!rounded-xl !border-line-strong !bg-surface !text-fg !shadow-2xl',
              descriptionClassName: '!text-fg-2 !font-mono !text-[11.5px]',
            }}
          />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
