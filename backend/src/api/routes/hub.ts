import express, { Request, Response } from 'express';
import { getJamSlugs, getEntries, getJamEndDate } from '../../services/entries.js';
import { getAllJamStats } from '../../services/database.js';

interface JamSummary {
  slug: string;
  entryCount: number;
  judgeCount: number;
  voteCount: number;
  endDate?: string | null;
}

const router: express.Router = express.Router();

// GET /api/jams - Public: list all jams with stats
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [slugs, stats] = await Promise.all([getJamSlugs(), getAllJamStats()]);

    const statsMap = new Map(stats.map((s) => [s.jam_slug, s]));

    const jams = await Promise.allSettled(
      slugs.map(async (slug) => {
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
      .map((r) => r.value)
      .sort((a, b) => {
        const n = (s: string) => parseInt(s.replace('gj', ''), 10);
        return n(b.slug) - n(a.slug);
      });

    // Include endDate for the latest jam so the client can hide judging buttons
    if (results.length > 0) {
      results[0].endDate = await getJamEndDate(results[0].slug);
    }

    res.json(results);
  } catch (err) {
    console.error('Error listing jams:', err);
    res.status(500).json({ error: 'Failed to list jams' });
  }
});

export default router;
