import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// The UI never talks to the backend cross-origin: the FastAPI app has no CORS
// middleware, so the dev/preview server proxies both upstreams under one origin.
//   /api/*     -> FastAPI (make start)           e.g. /api/health -> :8000/health
//   /inngest/* -> Inngest dev server (docker)    e.g. /inngest/v1/events -> :8288/v1/events
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here('.'), '')
  const apiUrl = env.KB_API_URL || 'http://localhost:8000'
  const inngestUrl = env.INNGEST_URL || 'http://localhost:8288'
  const adminerUrl = env.ADMINER_URL || 'http://localhost:8081'
  const memgraphLabUrl = env.MEMGRAPH_LAB_URL || 'http://localhost:3000'

  const proxy: Record<string, ProxyOptions> = {
    '/api': { target: apiUrl, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
    '/inngest': {
      target: inngestUrl,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/inngest/, ''),
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        // The allowlist is read straight from the repo, so the UI always offers
        // exactly the feeds the pipeline accepts. A regex, so `@allowlist?raw` matches.
        { find: /^@allowlist/, replacement: here('../publications.yaml') },
        { find: /^@\//, replacement: `${here('./src')}/` },
      ],
    },
    define: {
      __KB_API_URL__: JSON.stringify(apiUrl),
      __INNGEST_URL__: JSON.stringify(inngestUrl),
      __ADMINER_URL__: JSON.stringify(adminerUrl),
      __MEMGRAPH_LAB_URL__: JSON.stringify(memgraphLabUrl),
    },
    server: { port: 5173, proxy, fs: { allow: [here('..')] } },
    preview: { port: 4173, proxy },
  }
})
