import { useState, useEffect } from 'react';
import { formatJamTitle } from '../utils/jam';

const GITHUB_API = 'https://api.github.com/repos/dojoengine/game-jams/contents';
const RAW_BASE = 'https://raw.githubusercontent.com/dojoengine/game-jams/main';

interface GameJam {
  slug: string;
  title: string;
  startDate: Date;
  endDate: Date;
  prizePool: string;
  registrationUrl?: string;
  isActive: boolean;
}

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (m) result[m[1]] = m[2];
  }
  return result;
}

function findLatestJamSlug(items: Array<{ name: string; type: string }>): string | null {
  const jams = items
    .filter((i) => i.type === 'dir' && /^gj\d+$/.test(i.name))
    .map((i) => ({ name: i.name, num: parseInt(i.name.slice(2)) }))
    .sort((a, b) => b.num - a.num);
  return jams[0]?.name ?? null;
}

export function useGameJam() {
  const [jam, setJam] = useState<GameJam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchJam() {
      try {
        const dirRes = await fetch(GITHUB_API, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!dirRes.ok) return;
        const items = await dirRes.json();
        const slug = findLatestJamSlug(items);
        if (!slug) return;

        const readmeRes = await fetch(`${RAW_BASE}/${slug}/README.md`);
        if (!readmeRes.ok) return;
        const raw = await readmeRes.text();
        const fm = parseFrontmatter(raw);

        if (!fm.start_date || !fm.end_date || !fm.prize_pool) return;

        // Parse as noon local time to avoid timezone day-shift
        const startDate = new Date(fm.start_date + 'T12:00:00');
        const endDate = new Date(fm.end_date + 'T12:00:00');
        // AOE (UTC-12) expiry for isActive check
        const expiresAt = new Date(fm.end_date + 'T23:59:59-12:00');
        if (cancelled) return;

        setJam({
          slug,
          title: formatJamTitle(slug),
          startDate,
          endDate,
          prizePool: fm.prize_pool,
          registrationUrl: fm.registration_url || undefined,
          isActive: new Date() <= expiresAt,
        });
      } catch {
        // Fail silently — card will show fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJam();
    return () => { cancelled = true; };
  }, []);

  return { jam, loading };
}
