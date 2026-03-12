import express, { Request, Response } from 'express';
import { getJudgeLeaderboard } from '../../services/database.js';
import { resolveUsers } from '../../services/discord.js';
import { JUDGING_SESSION_SIZE } from '../../constants/judging.js';

const router: express.Router = express.Router();

// GET /api/judges/leaders - Global judge leaderboard
router.get('/leaders', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await getJudgeLeaderboard();

    if (rows.length === 0) {
      res.json({ leaders: [] });
      return;
    }

    const profiles = await resolveUsers(rows.map((r) => r.judge_id));

    const leaders = rows.map((r) => {
      const profile = profiles.get(r.judge_id);
      return {
        id: r.judge_id,
        username: profile?.username ?? null,
        avatar: profile?.avatar ?? null,
        sessions: Math.floor(r.total_comparisons / JUDGING_SESSION_SIZE),
        comparisons: r.total_comparisons,
        jams: r.jam_count,
      };
    });

    res.json({ leaders });
  } catch (err) {
    console.error('Error generating judge leaderboard:', err);
    res.status(500).json({ error: 'Failed to generate leaderboard' });
  }
});

export default router;
