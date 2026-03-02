import yaml from 'js-yaml';

const GITHUB_HEADERS: Record<string, string> = {
  Accept: 'application/vnd.github.v3+json',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
};

export interface EntryMetrics {
  classification: 'Whole Game' | 'Feature';
  team_size: number;
  dojo_models: number;
  dojo_systems: number;
  dojo_events: number;
  client_sdk: string;
  jam_commits_pct: number;
  playability: 'Live' | 'Video' | 'None';
  repo_unavailable?: boolean;
}

export interface Entry {
  id: string;
  emoji: string;
  title: string;
  summary_short: string;
  summary_long: string;
  work_done_short: string;
  work_done_long: string;
  repo_url: string;
  demo_url?: string;
  video_url?: string;
  team: string[];
  metrics: EntryMetrics;
}

// Parse YAML frontmatter from a markdown string.
// Returns null if no frontmatter is present.
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Convert parsed frontmatter to an Entry, or null if required fields are missing.
function frontmatterToEntry(data: Record<string, unknown>): Entry | null {
  const metrics = data.metrics as Record<string, unknown> | undefined;
  if (!data.id || !data.title || !data.repo_url || !metrics) return null;

  return {
    id: String(data.id),
    emoji: String(data.emoji || '🎮'),
    title: String(data.title),
    summary_short: String(data.summary_short || ''),
    summary_long: String(data.summary_long || ''),
    work_done_short: String(data.work_done_short || ''),
    work_done_long: String(data.work_done_long || ''),
    repo_url: String(data.repo_url),
    demo_url: data.demo_url ? String(data.demo_url) : undefined,
    video_url: data.video_url ? String(data.video_url) : undefined,
    team: Array.isArray(data.team) ? data.team.map(String) : [],
    metrics: {
      classification: metrics.classification === 'Feature' ? 'Feature' : 'Whole Game',
      team_size: Number(metrics.team_size) || 1,
      dojo_models: Number(metrics.dojo_models) || 0,
      dojo_systems: Number(metrics.dojo_systems) || 0,
      dojo_events: Number(metrics.dojo_events) || 0,
      client_sdk: metrics.client_sdk
        ? String(metrics.client_sdk)
        : metrics.frontend_sdk
          ? 'dojo.js'
          : 'None',
      jam_commits_pct: Number(metrics.jam_commits_pct) || 0,
      playability:
        metrics.playability === 'Live'
          ? 'Live'
          : metrics.playability === 'Video'
            ? 'Video'
            : 'None',
      ...(metrics.repo_unavailable ? { repo_unavailable: true } : {}),
    },
  };
}

// Fetch the directory listing for a jam folder from GitHub,
// then fetch and parse each .md file's frontmatter.
async function fetchEntriesFromGitHub(jamSlug: string): Promise<Entry[]> {
  const dirUrl = `https://api.github.com/repos/dojoengine/game-jams/contents/${jamSlug}`;
  const dirRes = await fetch(dirUrl, { headers: GITHUB_HEADERS });
  if (!dirRes.ok) return [];

  const files = (await dirRes.json()) as Array<{
    name: string;
    download_url: string;
  }>;
  const mdFiles = files.filter((f) => f.name.endsWith('.md') && f.name !== 'README.md');

  const entries: Entry[] = [];
  await Promise.all(
    mdFiles.map(async (file) => {
      try {
        const res = await fetch(file.download_url, { headers: GITHUB_HEADERS });
        if (!res.ok) return;
        const content = await res.text();
        const data = parseFrontmatter(content);
        if (!data) return;
        const entry = frontmatterToEntry(data);
        if (entry) entries.push(entry);
      } catch {
        // Skip files that fail to fetch or parse
      }
    })
  );

  return entries;
}

// In-memory cache for GitHub-fetched entries
const entriesCache: Map<string, { entries: Entry[]; fetchedAt: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getEntries(jamSlug: string): Promise<Entry[]> {
  // Check cache first
  const cached = entriesCache.get(jamSlug);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.entries;
  }

  // Fetch enriched .md files from GitHub
  const entries = await fetchEntriesFromGitHub(jamSlug);

  // Cache the result (even if empty, to avoid hammering GitHub)
  entriesCache.set(jamSlug, { entries, fetchedAt: Date.now() });

  return entries;
}

export function getEntryById(entries: Entry[], id: string): Entry | undefined {
  return entries.find((e) => e.id === id);
}

// In-memory cache for jam slug discovery
let jamSlugsCache: { slugs: string[]; fetchedAt: number } | null = null;

/**
 * Discover all jam slugs by listing directories in the game-jams repo.
 */
export async function getJamSlugs(): Promise<string[]> {
  if (jamSlugsCache && Date.now() - jamSlugsCache.fetchedAt < CACHE_TTL) {
    return jamSlugsCache.slugs;
  }

  const res = await fetch('https://api.github.com/repos/dojoengine/game-jams/contents', {
    headers: GITHUB_HEADERS,
  });
  if (!res.ok) return jamSlugsCache?.slugs ?? [];

  const items = (await res.json()) as Array<{ name: string; type: string }>;
  const slugs = items.filter((i) => i.type === 'dir' && /^gj\d+$/.test(i.name)).map((i) => i.name);

  jamSlugsCache = { slugs, fetchedAt: Date.now() };
  return slugs;
}

// In-memory cache for jam end dates
const endDateCache: Map<string, { endDate: string | null; fetchedAt: number }> = new Map();

/**
 * Fetch the end_date from a jam's README.md frontmatter.
 */
export async function getJamEndDate(jamSlug: string): Promise<string | null> {
  const cached = endDateCache.get(jamSlug);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.endDate;
  }

  let endDate: string | null = null;
  try {
    const url = `https://raw.githubusercontent.com/dojoengine/game-jams/main/${jamSlug}/README.md`;
    const res = await fetch(url, { headers: GITHUB_HEADERS });
    if (res.ok) {
      const raw = await res.text();
      const data = parseFrontmatter(raw);
      if (data?.end_date) endDate = String(data.end_date);
    }
  } catch {
    // Fall through with null
  }

  endDateCache.set(jamSlug, { endDate, fetchedAt: Date.now() });
  return endDate;
}

// Exported for testing
export { parseFrontmatter, frontmatterToEntry };
