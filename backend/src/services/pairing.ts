import { Entry } from './entries.js';
import { getComparisonsForJam } from './database.js';
import { JUDGING_SESSION_SIZE } from '../constants/judging.js';
import { PowerRanker, pairKey } from '../lib/power/index.js';

/**
 * Randomize left/right presentation order to prevent position bias
 */
function randomizeOrder(entryA: Entry, entryB: Entry): { entryA: Entry; entryB: Entry } {
  if (Math.random() < 0.5) {
    return { entryA, entryB };
  }
  return { entryA: entryB, entryB: entryA };
}

/**
 * Select a batch of pairs for a judging session.
 *
 * Uses PowerRanker for impact-weighted, uncertainty-driven pair selection.
 * Excludes pairs the judge has already voted on.
 * Randomizes left/right presentation order.
 */
export async function selectSessionPairs(
  jamSlug: string,
  judgeId: string | null,
  entries: Entry[],
  count: number = JUDGING_SESSION_SIZE
): Promise<{ entryA: Entry; entryB: Entry; impact: number }[]> {
  if (entries.length < 2) return [];

  const comparisons = await getComparisonsForJam(jamSlug);

  // Build PowerRanker with all entries and existing comparisons
  const items = new Set(entries.map((e) => e.id));
  const ranker = new PowerRanker({ items });

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

  // Build exclusion set for this judge
  const exclude = new Set<string>();
  if (judgeId) {
    for (const comp of comparisons) {
      if (comp.judge_id === judgeId) {
        exclude.add(pairKey(comp.entry_a_id, comp.entry_b_id));
      }
    }
  }

  // Select pairs via active ranking
  const selected = ranker.select({ num: count, exclude, impact: true });

  // Normalize weights to 0–100 relative to session max
  const maxWeight = Math.max(...selected.map((p) => p.weight));

  // Map back to entries with randomized presentation order
  const entryMap = new Map(entries.map((e) => [e.id, e]));
  return selected.map((pair) => {
    const entryA = entryMap.get(pair.alpha)!;
    const entryB = entryMap.get(pair.beta)!;
    const impact = maxWeight > 0 ? Math.round((pair.weight / maxWeight) * 100) : 50;
    return { ...randomizeOrder(entryA, entryB), impact };
  });
}
