import { Comparison } from './database.js';
import { PowerRanker } from '../lib/power/index.js';

/** Prior pseudocount per cell: k = C / n.
 *  Gives exactly C pseudocounts of prior per item, independent of vote count.
 *  More data naturally overwhelms the fixed prior; larger matrices get weaker per-cell prior
 *  but constant per-item regularization. */
const PRIOR_STRENGTH = 1;

/**
 * Build a PowerRanker from entry IDs and comparisons.
 * Returns null if fewer than 2 entries.
 */
export function buildRanker(entryIds: string[], comparisons: Comparison[]): PowerRanker | null {
  const n = entryIds.length;
  if (n < 2) return null;

  const k = PRIOR_STRENGTH / n;

  const items = new Set(entryIds);
  const ranker = new PowerRanker({ items, options: { k } });

  const prefs = comparisons
    .filter((c) => c.score !== null)
    .map((c) => ({
      target: c.entry_a_id,
      source: c.entry_b_id,
      value: c.score!,
    }));

  if (prefs.length > 0) {
    ranker.addPreferences(prefs);
  }

  return ranker;
}
