import { Entry } from './entries.js';
import { getComparisonsForJam } from './database.js';
import { JUDGING_SESSION_SIZE } from '../constants/judging.js';

interface PairScore {
  entryA: Entry;
  entryB: Entry;
  variance: number;
}

/**
 * Get canonical pair key (smaller ID first)
 */
function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

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
 * For authenticated judges: uses Beta distribution uncertainty sampling,
 * excludes pairs the judge has already voted on.
 * For anonymous users (judgeId is null): random selection from all pairs.
 *
 * Samples without replacement — each selected pair is removed from the pool.
 */
export async function selectSessionPairs(
  jamSlug: string,
  judgeId: string | null,
  entries: Entry[],
  count: number = JUDGING_SESSION_SIZE
): Promise<{ entryA: Entry; entryB: Entry }[]> {
  if (entries.length < 2) return [];

  const comparisons = await getComparisonsForJam(jamSlug);

  // Build set of pairs this judge has already compared
  const judgeComparedPairs = new Set<string>();
  if (judgeId) {
    for (const comp of comparisons) {
      if (comp.judge_id === judgeId) {
        judgeComparedPairs.add(pairKey(comp.entry_a_id, comp.entry_b_id));
      }
    }
  }

  // Build win counts for variance calculation
  const pairWins: Map<string, { winsA: number; winsB: number }> = new Map();
  for (const comp of comparisons) {
    const key = pairKey(comp.entry_a_id, comp.entry_b_id);
    const current = pairWins.get(key) || { winsA: 0, winsB: 0 };

    if (comp.score === null) {
      // Skipped - don't count
    } else if (comp.score > 0.5) {
      current.winsA++;
    } else if (comp.score < 0.5) {
      current.winsB++;
    }

    pairWins.set(key, current);
  }

  // Build candidate pool: all pairs not yet judged by this user
  const candidates: PairScore[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const entryA = entries[i];
      const entryB = entries[j];
      const key = pairKey(entryA.id, entryB.id);

      if (judgeComparedPairs.has(key)) continue;

      const wins = pairWins.get(key) || { winsA: 0, winsB: 0 };
      const alpha = wins.winsA + 1;
      const beta = wins.winsB + 1;
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));

      candidates.push({ entryA, entryB, variance });
    }
  }

  // Sample without replacement
  const selected: { entryA: Entry; entryB: Entry }[] = [];
  const remaining = [...candidates];

  for (let pick = 0; pick < count && remaining.length > 0; pick++) {
    const totalVariance = remaining.reduce((sum, p) => sum + p.variance, 0);

    let idx: number;
    if (judgeId && totalVariance > 0) {
      // Weighted random selection by variance
      let random = Math.random() * totalVariance;
      idx = remaining.length - 1; // fallback
      for (let k = 0; k < remaining.length; k++) {
        random -= remaining[k].variance;
        if (random <= 0) {
          idx = k;
          break;
        }
      }
    } else {
      // Random selection for anonymous users or zero variance
      idx = Math.floor(Math.random() * remaining.length);
    }

    const pair = remaining[idx];
    selected.push(randomizeOrder(pair.entryA, pair.entryB));
    remaining.splice(idx, 1);
  }

  return selected;
}
