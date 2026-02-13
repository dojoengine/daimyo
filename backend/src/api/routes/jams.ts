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

    // Check session progress (needed for sessions count in all responses)
    const progress = await getSessionProgress(slug, judgeId);

    // Check if all pairs exhausted
    const exhausted = await hasExhaustedAllPairs(slug, judgeId, entries);
    if (exhausted) {
      res.json({ allPairsExhausted: true, progress });
      return;
    }
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
      res.json({ allPairsExhausted: true, progress });
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

// POST /api/jams/:slug/vote - Record a vote (Likert scale)
// Body: { entryAId, entryBId, score } where score is 0.0-1.0
// Or: { entryAId, entryBId, score: null, invalid: true } to flag an invalid pair
router.post('/:slug/vote', async (req: Request, res: Response): Promise<void> => {
  const slug = getSlug(req.params);
  const { entryAId, entryBId, score, invalid } = req.body;
  const judgeId = req.user!.id;

  if (!entryAId || !entryBId) {
    res.status(400).json({ error: 'Missing entry IDs' });
    return;
  }

  if (invalid) {
    if (score !== null && score !== undefined) {
      res.status(400).json({ error: 'Invalid pair must have null score' });
      return;
    }
  } else if (typeof score !== 'number' || score < 0 || score > 1) {
    res.status(400).json({ error: 'Score must be a number between 0.0 and 1.0' });
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

    await insertComparison(slug, judgeId, entryAId, entryBId, invalid ? null : score);

    // Check if session is complete
    const progress = await getSessionProgress(slug, judgeId);
    const sessionComplete = progress.completed >= 10;

    res.json({
      recorded: true,
      sessionComplete,
      sessions: progress.sessions,
    });
  } catch (err) {
    console.error('Error recording vote:', err);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

export default router;
