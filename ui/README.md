# Substack Brain UI

A browser console for using and testing the Substack Brain backend. It talks to the
API exactly as it exists today, with no backend changes: everything below is built
from `GET /health`, `GET /search`, `POST /ask`, `GET /sources/{id}`, `POST /publications`,
`POST /articles`, `GET /jobs/{event_id}`, `POST /evals/run` and `GET /evals/latest`, plus
the Inngest dev server's own REST API.

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

Override the targets with `KB_API_URL`, `INNGEST_URL`, `ADMINER_URL` and `MEMGRAPH_LAB_URL`
(default `http://localhost:3000`) as env vars or in `ui/.env.local`.
`npm run build && npm run preview` serves the production build on :4173 with the same proxy.

## Pages

- **Overview**: health (Postgres, Inngest, Memgraph), corpus size including active
  claims and graph topics, the allowlisted publications (read from
  `../publications.yaml` at build time), recent jobs, answer latency and a live
  Inngest event feed.
- **Ask**: `POST /ask` with inline citation chips. Hover a chip to read the passage.
  The page runs `GET /search?mode=hybrid` with the same question and limit alongside
  the answer. That's the same retrieval `/ask` does internally, so the sources show up
  before Claude has finished and the citations get their text, engine ranks (BM25,
  vector, graph) and any matched claim with its type (opinion, measurement or prediction).
  It also flags the API's 200-with-an-error fallbacks (LLM failure, no `ANTHROPIC_API_KEY`).
  Under each answer, the `evaluate-answer` verdict for its snapshot appears once the
  background judges finish (composite score, code checks, faithfulness, disagreement,
  failure codes and the faithfulness critique).
- **Search Lab**: one query against `sparse`, `dense` and `hybrid` side by side.
  Hovering a passage highlights it in every column. Each card shows its rank in the
  other two lists. Since week 4 the hybrid column is a 3-way RRF over BM25, vectors and the
  Memgraph claim graph. The graph has no `mode` of its own on `/search`, so it only appears
  inside hybrid as a Graph rank and the claim it matched. The hybrid column breaks the RRF
  score into its `1/(k+rank)` terms, with `k` inferred from the results.
- **Evals** (week 5): everything in `GET /evals/latest`. Pass rates for code checks and the
  faithfulness judge over the last 10, 25 or 50 evaluated answers, the failure taxonomy
  (`FM-1`..`FM-6`, names from `../evals/taxonomy.yaml`) with counts, recent verdicts with
  critiques, and the latest benchmark run: recall@5, MRR and cross-publication coverage for
  sparse, dense, 2-way and 3-way RRF on the fixture corpus. **Run golden_v1** calls
  `POST /evals/run` (optionally replaying recent `failures` rows) and tracks the run like
  any other job.
- **Ingest & jobs**: backfill one or all publications, ingest a single article (the
  URL is checked against the allowlist as you type, but you can still send a bad one
  to test the 400), and trigger a freshness poll. Jobs are polled every 2s via
  `GET /jobs/{event_id}`, and the run's output comes from Inngest.

Every source and citation has a **Provenance** button that opens `GET /sources/{id}`
for its `claim_id` (or `passage_id` if it has none). It shows the verbatim quote, topics,
author and publication, and temporal validity, and you can follow `supersedes_id` links.
Pasting a UUID into the command palette opens the same sheet.

Press **⌘K / Ctrl+K** anywhere to ask, compare retrievers, backfill, sync, run the eval suite or jump to
a page. The **API console** (terminal icon) logs every request with its payloads and
timing, plus a copy-as-curl button.

## What lives where

The API has no endpoints to list jobs or read snapshots back (the Ask page finds an
answer's evaluation by scanning the 50 most recent in `GET /evals/latest`), so the UI keeps two
things in this browser's `localStorage`: the jobs you started and your answer history.
Clearing site data loses only those lists. The real records stay in Postgres.

"Sync now" is the one call that bypasses the FastAPI app. No HTTP endpoint triggers a
freshness poll (only the MCP tool `kb_sync` does), so the UI sends the same
`kb/feed.poll` event straight to the Inngest dev server's event API.

## Stack

React 19, Vite, TypeScript, Tailwind CSS v4, shadcn-style components on Radix,
TanStack Query, Motion, cmdk, Recharts and lucide icons.
