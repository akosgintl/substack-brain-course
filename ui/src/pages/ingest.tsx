import { useQueryClient } from '@tanstack/react-query'
import { FileText, Rss, Workflow } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { JobCard } from '@/components/job-card'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { ingestArticle, startBackfill, startBackfillAll, syncNow } from '@/lib/actions'
import { findPublicationForUrl, publications } from '@/lib/allowlist'
import { isDone, type JobView, jobsStore } from '@/lib/jobs'
import { useStore } from '@/lib/store'
import { cn, hostOf } from '@/lib/utils'

const EXAMPLE_URL = 'https://www.theneuralmaze.com/p/the-complete-guide-to-event-driven'

function useBusy() {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await fn()
      return true
    } catch {
      return false // the action already raised a toast
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

function BackfillCard() {
  const [slug, setSlug] = useState(publications[0]?.slug ?? '')
  const { busy, run } = useBusy()
  const pub = publications.find((p) => p.slug === slug)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="size-4 text-muted" /> Backfill a publication
        </CardTitle>
        <CardDescription>
          <span className="font-mono">POST /publications</span> sends <span className="font-mono">kb/publication.added</span>. Discovery reads the feed and fans out one <span className="font-mono">ingest-article</span> run per new post, 3 at a time per publication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" className="space-y-2">
          {publications.map((p) => (
            <button
              key={p.slug}
              type="button"
              role="radio"
              aria-checked={slug === p.slug}
              onClick={() => setSlug(p.slug)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                slug === p.slug ? 'border-accent/50 bg-accent-soft' : 'border-line hover:border-line-strong',
              )}
            >
              <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border-2', slug === p.slug ? 'border-accent' : 'border-line-strong')}>
                {slug === p.slug ? <span className="size-1.5 rounded-full bg-accent" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
                <span className="block truncate font-mono text-[11px] text-muted">{p.feed_url}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" disabled={!pub} loading={busy === 'one'} onClick={() => pub && run('one', () => startBackfill(pub))}>
            Backfill {pub ? hostOf(pub.homepage) : ''}
          </Button>
          <Button loading={busy === 'all'} onClick={() => run('all', startBackfillAll)}>
            Backfill all {publications.length}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ArticleCard() {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const { busy, run } = useBusy()
  const match = url.trim() ? findPublicationForUrl(url) : null
  const hosts = [...new Set(publications.map((p) => hostOf(p.homepage)))].join(', ')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-muted" /> Ingest one article
        </CardTitle>
        <CardDescription>
          <span className="font-mono">POST /articles</span> tags the event <span className="font-mono">via="manual"</span>, which jumps it +600s ahead of any queued backfill. Re-ingesting an unchanged article is a no-op; a changed one supersedes its old passages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.theneuralmaze.com/p/…" className="font-mono text-[13px]" />
        <div className="min-h-6 text-[12px]">
          {!url.trim() ? (
            <span className="text-muted">
              Allowed hosts: {hosts}.{' '}
              <button type="button" className="cursor-pointer font-medium text-accent hover:underline" onClick={() => setUrl(EXAMPLE_URL)}>
                Use an example
              </button>
            </span>
          ) : match ? (
            <StatusPill kind="ok" label={`Allowlisted · ${match.name}`} />
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill kind="warn" label="Outside the allowlist" />
              <span className="text-muted">The API will answer 400. Send it anyway to test that path.</span>
            </span>
          )}
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional, the parser finds the real one)" />
        <Button
          variant="primary"
          disabled={!url.trim()}
          loading={busy === 'article'}
          onClick={async () => {
            if (await run('article', () => ingestArticle(url.trim(), title.trim()))) {
              setUrl('')
              setTitle('')
            }
          }}
        >
          Ingest now
        </Button>
      </CardContent>
    </Card>
  )
}

function FreshnessCard() {
  const { busy, run } = useBusy()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rss className="size-4 text-muted" /> Freshness poll
        </CardTitle>
        <CardDescription>
          <span className="font-mono">poll-feeds</span> runs every 5 minutes. Each feed gets a conditional GET with ETag / If-Modified-Since; a 304 costs zero downstream work. This sends <span className="font-mono">kb/feed.poll</span> to the Inngest dev server to run it now.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button loading={busy === 'sync'} onClick={() => run('sync', syncNow)}>
          <Rss /> Run poll now
        </Button>
      </CardContent>
    </Card>
  )
}

export function IngestPage() {
  const jobs = useStore(jobsStore)
  const qc = useQueryClient()
  const clearFinished = () => {
    jobsStore.set((prev) =>
      prev.filter((j) => {
        const v = qc.getQueryData<JobView>(['job', j.event_id])
        return !v || !isDone(v.phase)
      }),
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Writes → Inngest"
        title="Ingest & jobs"
        description="Writes return a handle straight away; the work runs as durable Inngest steps. Track progress here, or open any run's trace in the dev server."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <BackfillCard />
          <ArticleCard />
          <FreshnessCard />
        </div>
        <div>
          <Card className="xl:sticky xl:top-6">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Jobs</CardTitle>
                <CardDescription>
                  Polled every 2s via <span className="font-mono">GET /jobs/{'{event_id}'}</span>, plus the run's output from Inngest.
                </CardDescription>
              </div>
              {jobs.length ? (
                <Button variant="ghost" size="sm" onClick={clearFinished}>
                  Clear finished
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2.5">
              {jobs.length ? (
                <AnimatePresence initial={false}>
                  {jobs.map((j) => (
                    <JobCard key={j.event_id} job={j} />
                  ))}
                </AnimatePresence>
              ) : (
                <EmptyState icon={<Workflow />} title="Nothing tracked yet">
                  Jobs you start from this browser appear here with live progress.
                </EmptyState>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
