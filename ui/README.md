# Substack Brain UI

A browser console for using and testing the Substack Brain backend. It talks to the
API exactly as it exists today, with no backend changes: everything below is built
from `GET /health`, `GET /search`, `POST /ask`, `POST /publications`, `POST /articles`
and `GET /jobs/{event_id}`, plus the Inngest dev server's own REST API.

## Run it

The backend has to be up first (`make start` from the repo root, plus Docker for
Postgres and Inngest). Then:

```bash
cd ui
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies everything, so the browser never makes a cross-origin call
(the FastAPI app has no CORS middleware):

| Browser path | Goes to | Default |
|---|---|---|
| `/api/*` | FastAPI app | `http://localhost:8000` |
| `/inngest/*` | Inngest dev server | `http://localhost:8288` |

Override the targets with `KB_API_URL`, `INNGEST_URL` and `ADMINER_URL` (env vars or `ui/.env.local`).
`npm run build && npm run preview` serves the production build on :4173 with the same proxy.

## Pages

- **Overview**: health, corpus size, the allowlisted publications (read from
  `../publications.yaml` at build time), recent jobs, answer latency and a live
  Inngest event feed.
- **Ask**: `POST /ask` with inline citation chips. Hover a chip to read the passage.
  The page runs `GET /search?mode=hybrid` with the same question and limit alongside
  the answer. That's the same retrieval `/ask` does internally, so the sources show up
  before Claude has finished and the citations get their text and engine ranks. It also
  flags the API's 200-with-an-error fallbacks (LLM failure, no `ANTHROPIC_API_KEY`).
- **Search Lab**: one query against `sparse`, `dense` and `hybrid` side by side.
  Hovering a passage highlights it in every column. Each card shows its rank in the
  other two lists. The hybrid column breaks the RRF score into its `1/(k+rank)` terms,
  with `k` inferred from the results.
- **Ingest & jobs**: backfill one or all publications, ingest a single article (the
  URL is checked against the allowlist as you type, but you can still send a bad one
  to test the 400), and trigger a freshness poll. Jobs are polled every 2s via
  `GET /jobs/{event_id}`, and the run's output comes from Inngest.

Press **⌘K / Ctrl+K** anywhere to ask, compare retrievers, backfill, sync or jump to
a page. The **API console** (terminal icon) logs every request with its payloads and
timing, plus a copy-as-curl button.

## What lives where

The API has no endpoints to list jobs or read snapshots back, so the UI keeps two
things in this browser's `localStorage`: the jobs you started and your answer history.
Clearing site data loses only those lists. The real records stay in Postgres.

"Sync now" is the one call that bypasses the FastAPI app. No HTTP endpoint triggers a
freshness poll (only the MCP tool `kb_sync` does), so the UI sends the same
`kb/feed.poll` event straight to the Inngest dev server's event API.

## Stack

React 19, Vite, TypeScript, Tailwind CSS v4, shadcn-style components on Radix,
TanStack Query, Motion, cmdk, Recharts and lucide icons.
