import express, { Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { getEntries, getEntryById } from '../../services/entries.js';
import { selectSessionPairs } from '../../services/pairing.js';
import {
  insertComparison,
  getComparisonCountForJudge,
  getComparisonsForJam,
} from '../../services/database.js';
import { calculateRankings, calculateStats } from '../../services/ranking.js';
import { JUDGING_SESSION_SIZE } from '../../constants/judging.js';

const router: express.Router = express.Router();

// Helper to safely get slug from params
function getSlug(params: Record<string, string | string[] | undefined>): string {
  const slug = params.slug;
  return Array.isArray(slug) ? slug[0] : slug || '';
}

// GET /api/jams/:slug/session - Get a batch of pairs for a judging session (public)
router.get(
  '/:slug/session',
  optionalAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const slug = getSlug(req.params);
    const judgeId = req.user?.id ?? null;

    try {
      const entries = await getEntries(slug);

      if (entries.length < 2) {
        res.status(400).json({ error: 'Not enough entries for comparison' });
        return;
      }

      const pairs = await selectSessionPairs(slug, judgeId, entries);

      const response: Record<string, unknown> = {
        pairs,
        sessionSize: JUDGING_SESSION_SIZE,
      };

      // Include session count for authenticated judges
      if (judgeId) {
        const count = await getComparisonCountForJudge(slug, judgeId);
        response.sessions = Math.floor(count / JUDGING_SESSION_SIZE);
      }

      res.json(response);
    } catch (err) {
      console.error('Error generating session:', err);
      res.status(500).json({ error: 'Failed to generate session' });
    }
  }
);

// POST /api/jams/:slug/session - Submit a batch of votes (auth required)
router.post(
  '/:slug/session',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const slug = getSlug(req.params);
    const judgeId = req.user!.id;
    const { votes } = req.body;

    if (!Array.isArray(votes) || votes.length === 0) {
      res.status(400).json({ error: 'Missing or empty votes array' });
      return;
    }

    try {
      const entries = await getEntries(slug);

      for (const vote of votes) {
        const { entryAId, entryBId, score } = vote;

        if (!entryAId || !entryBId) {
          res.status(400).json({ error: 'Missing entry IDs in vote' });
          return;
        }

        if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
          res.status(400).json({ error: 'Score must be a number between 0.0 and 1.0' });
          return;
        }

        if (!getEntryById(entries, entryAId) || !getEntryById(entries, entryBId)) {
          res.status(400).json({ error: `Invalid entry IDs: ${entryAId}, ${entryBId}` });
          return;
        }
      }

      // All validated — insert sequentially
      for (const vote of votes) {
        await insertComparison(slug, judgeId, vote.entryAId, vote.entryBId, vote.score);
      }

      const count = await getComparisonCountForJudge(slug, judgeId);
      const sessions = Math.floor(count / JUDGING_SESSION_SIZE);

      res.json({ recorded: true, count: votes.length, sessions });
    } catch (err) {
      console.error('Error recording session:', err);
      res.status(500).json({ error: 'Failed to record session' });
    }
  }
);

// GET /api/jams/:slug/results - Public: get ranked results for a jam
router.get('/:slug/results', async (req: Request, res: Response): Promise<void> => {
  const slug = getSlug(req.params);

  try {
    const [entries, comparisons] = await Promise.all([
      getEntries(slug),
      getComparisonsForJam(slug),
    ]);

    if (entries.length === 0) {
      res.status(404).json({ error: 'No entries found for this jam' });
      return;
    }

    const rankings = calculateRankings(entries, comparisons);
    const stats = calculateStats(comparisons);

    res.json({ rankings, stats });
  } catch (err) {
    console.error('Error generating results:', err);
    res.status(500).json({ error: 'Failed to generate results' });
  }
});

export default router;
