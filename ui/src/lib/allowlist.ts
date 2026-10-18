import raw from '@allowlist?raw'
import { parse } from 'yaml'

/** Mirrors `PublicationEntry` in kb/sources/allowlist.py. */
export interface PublicationEntry {
  slug: string
  name: string
  feed_url: string
  homepage: string
  notes?: string | null
  archive_urls?: string[] | null
  sitemap_url?: string | null
}

function load(): PublicationEntry[] {
  try {
    const doc = parse(raw) as { publications?: PublicationEntry[] } | null
    return doc?.publications ?? []
  } catch {
    return []
  }
}

export const publications: PublicationEntry[] = load()

const host = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Same rule as `find_publication_for_url`: exact host match against homepage,
 * feed, archive and sitemap hosts. Only a hint for the form; the API still
 * decides (and returns 400 outside the allowlist).
 */
export function findPublicationForUrl(url: string): PublicationEntry | null {
  const h = host(url.trim())
  if (!h) return null
  for (const pub of publications) {
    const allowed = new Set([host(pub.homepage), host(pub.feed_url)])
    for (const u of pub.archive_urls ?? []) allowed.add(host(u))
    if (pub.sitemap_url) allowed.add(host(pub.sitemap_url))
    if (allowed.has(h)) return pub
  }
  return null
}
