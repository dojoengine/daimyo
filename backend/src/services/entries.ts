import yaml from 'js-yaml';
import { DUMMY_ENTRIES } from './entries.dummy.js';

export interface EntryMetrics {
  classification: 'Whole Game' | 'Feature';
  team_size: number;
  dojo_contracts: string;
  jam_commits_pct: number;
  playability: 'Live' | 'Video' | 'None';
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
      dojo_contracts: String(metrics.dojo_contracts || ''),
      jam_commits_pct: Number(metrics.jam_commits_pct) || 0,
      playability:
        metrics.playability === 'Live'
          ? 'Live'
          : metrics.playability === 'Video'
            ? 'Video'
            : 'None',
    },
  };
}

// Fetch the directory listing for a jam folder from GitHub,
// then fetch and parse each .md file's frontmatter.
async function fetchEntriesFromGitHub(jamSlug: string): Promise<Entry[]> {
  const dirUrl = `https://api.github.com/repos/dojoengine/game-jams/contents/${jamSlug}`;
  const dirRes = await fetch(dirUrl, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
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
        const res = await fetch(file.download_url);
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

  // In dev mode, use dummy data
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    return DUMMY_ENTRIES[jamSlug] || DUMMY_ENTRIES['gj7'];
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

// Exported for testing
export { parseFrontmatter, frontmatterToEntry };
