import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getEntries, getEntryById } from '../../services/entries.js';
import {
  selectNextPair,
  getSessionProgress,
  hasExhaustedAllPairs,
} from '../../services/pairing.js';
import { insertComparison } from '../../services/database.js';

const router: express.Router = express.Router();

// All jam routes require authentication
router.use(authMiddleware);

// Helper to safely get slug from params
function getSlug(params: Record<string, string | string[] | undefined>): string {
  const slug = params.slug;
  return Array.isArray(slug) ? slug[0] : slug || '';
}

// GET /api/jams/:slug/pair - Get next comparison pair
router.get('/:slug/pair', async (req: Request, res: Response): Promise<void> => {
  const slug = getSlug(req.params);
  const judgeId = req.user!.id;

  try {
    const entries = await getEntries(slug);

    if (entries.length < 2) {
      res.status(400).json({ error: 'Not enough entries for comparison' });
      return;
    }

    // Check if all pairs exhausted
    const exhausted = await hasExhaustedAllPairs(slug, judgeId, entries);
    if (exhausted) {
      res.json({ allPairsExhausted: true });
      return;
    }

    // Check session progress
    const progress = await getSessionProgress(slug, judgeId);
    if (progress.completed >= 10) {
      res.json({
        sessionComplete: true,
        progress,
      });
      return;
    }

    // Get next pair
    const pair = await selectNextPair(slug, judgeId, entries);
    if (!pair) {
      res.json({ allPairsExhausted: true });
      return;
    }

    res.json({
      entryA: pair.entryA,
      entryB: pair.entryB,
      progress,
    });
  } catch (err) {
    console.error('Error fetching pair:', err);
    res.status(500).json({ error: 'Failed to fetch pair' });
  }
});

// POST /api/jams/:slug/vote - Record a vote
router.post('/:slug/vote', async (req: Request, res: Response): Promise<void> => {
  const slug = getSlug(req.params);
  const { entryAId, entryBId, winnerId } = req.body;
  const judgeId = req.user!.id;

  if (!entryAId || !entryBId) {
    res.status(400).json({ error: 'Missing entry IDs' });
    return;
  }

  try {
    const entries = await getEntries(slug);

    // Verify entries exist
    const entryA = getEntryById(entries, entryAId);
    const entryB = getEntryById(entries, entryBId);

    if (!entryA || !entryB) {
      res.status(400).json({ error: 'Invalid entry IDs' });
      return;
    }

    // Calculate score
    // winnerId = null means skip
    // winnerId = entryAId means A wins (score = 1.0)
    // winnerId = entryBId means B wins (score = 0.0)
    let score: number | null = null;
    if (winnerId === entryAId) {
      score = 1.0;
    } else if (winnerId === entryBId) {
      score = 0.0;
    }
    // winnerId = null -> score = null (skipped)

    await insertComparison(slug, judgeId, entryAId, entryBId, score);

    // Check if session is complete
    const progress = await getSessionProgress(slug, judgeId);
    const sessionComplete = progress.completed >= 10;

    res.json({
      recorded: true,
      sessionComplete,
    });
  } catch (err) {
    console.error('Error recording vote:', err);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

export default router;
