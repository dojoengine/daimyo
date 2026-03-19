import express, { Request, Response } from 'express';
import { getJamSlugs, getEntries, getJamFrontmatter } from '../../services/entries.js';
import type { JamFrontmatter } from '../../services/entries.js';
import { getAllJamStats } from '../../services/database.js';
import { CONFIDENCE_N } from '../../constants/judging.js';

interface JamSummary {
  slug: string;
  entryCount: number;
  judgeCount: number;
  voteCount: number;
  startDate?: string | null;
  endDate?: string | null;
  prizePool?: string | null;
  registrationUrl?: string | null;
}

const router: express.Router = express.Router();

// GET /api/jams - Public: list jams with stats
// By default returns only the latest jam. Pass ?all=true to include past jams.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const all = req.query.all === 'true';
    const [slugs, stats] = await Promise.all([getJamSlugs(), getAllJamStats()]);

    const statsMap = new Map(stats.map((s) => [s.jam_slug, s]));
    const sortedSlugs = [...slugs].sort((a, b) => {
      const n = (s: string) => parseInt(s.replace('gj', ''), 10);
      return n(b) - n(a);
    });

    // Only fetch entries for the slugs we need
    const targetSlugs = all ? sortedSlugs : sortedSlugs.slice(0, 1);

    const jams = await Promise.allSettled(
      targetSlugs.map(async (slug) => {
        const entries = await getEntries(slug);
        const s = statsMap.get(slug);
        return {
          slug,
          entryCount: entries.length,
          judgeCount: s?.judge_count ?? 0,
          voteCount: s?.vote_count ?? 0,
        };
      })
    );

    const results = jams
      .filter((r): r is PromiseFulfilledResult<JamSummary> => r.status === 'fulfilled')
      .map((r) => r.value);

    // Include frontmatter for the latest jam so the homepage can render it
    if (results.length > 0) {
      const fm: JamFrontmatter = await getJamFrontmatter(results[0].slug);
      results[0].startDate = fm.startDate;
      results[0].endDate = fm.endDate;
      results[0].prizePool = fm.prizePool;
      results[0].registrationUrl = fm.registrationUrl;
    }

    res.json({ jams: results, confidenceN: CONFIDENCE_N, hasMore: !all && sortedSlugs.length > 1 });
  } catch (err) {
    console.error('Error listing jams:', err);
    res.status(500).json({ error: 'Failed to list jams' });
  }
});

export default router;
