import { Entry } from './entries.js';
import { getComparisonsForJam, getComparisonCountForJudge } from './database.js';
import { getTotalPairCount, JUDGING_SESSION_SIZE } from '../constants/judging.js';

interface PairScore {
  entryA: Entry;
  entryB: Entry;
  variance: number;
}

/**
 * Active ranking pair selection using Beta distribution uncertainty.
 * Higher variance pairs are more valuable to compare (more uncertain).
 */
export async function selectNextPair(
  jamSlug: string,
  judgeId: string,
  entries: Entry[]
): Promise<{ entryA: Entry; entryB: Entry } | null> {
  if (entries.length < 2) {
    return null;
  }

  // Get all comparisons for this jam
  const comparisons = await getComparisonsForJam(jamSlug);

  // Build a set of pairs this judge has already compared
  const judgeComparedPairs = new Set<string>();
  for (const comp of comparisons) {
    if (comp.judge_id === judgeId) {
      judgeComparedPairs.add(pairKey(comp.entry_a_id, comp.entry_b_id));
    }
  }

  // Build win counts for each pair
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
    // score === 0.5 would be a tie, also don't count

    pairWins.set(key, current);
  }

  // Calculate variance for all possible pairs (excluding already judged by this user)
  const pairScores: PairScore[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const entryA = entries[i];
      const entryB = entries[j];
      const key = pairKey(entryA.id, entryB.id);

      // Skip if this judge already compared this pair
      if (judgeComparedPairs.has(key)) {
        continue;
      }

      // Calculate Beta distribution variance
      const wins = pairWins.get(key) || { winsA: 0, winsB: 0 };
      const alpha = wins.winsA + 1; // Beta prior
      const beta = wins.winsB + 1;
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));

      pairScores.push({ entryA, entryB, variance });
    }
  }

  if (pairScores.length === 0) {
    return null; // All pairs exhausted for this judge
  }

  // Sample weighted by variance (higher variance = more likely to be selected)
  const totalVariance = pairScores.reduce((sum, p) => sum + p.variance, 0);

  if (totalVariance === 0) {
    // All pairs have equal uncertainty - pick randomly
    const idx = Math.floor(Math.random() * pairScores.length);
    const selected = pairScores[idx];
    return randomizeOrder(selected.entryA, selected.entryB);
  }

  // Weighted random selection
  let random = Math.random() * totalVariance;
  for (const pair of pairScores) {
    random -= pair.variance;
    if (random <= 0) {
      return randomizeOrder(pair.entryA, pair.entryB);
    }
  }

  // Fallback (shouldn't happen)
  const selected = pairScores[pairScores.length - 1];
  return randomizeOrder(selected.entryA, selected.entryB);
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
 * Get the number of comparisons this judge has made in current session.
 */
export async function getSessionProgress(
  jamSlug: string,
  judgeId: string
): Promise<{ completed: number; total: number; sessions: number }> {
  const comparisonCount = await getComparisonCountForJudge(jamSlug, judgeId);
  const completed = comparisonCount % JUDGING_SESSION_SIZE;
  const sessions = Math.floor(comparisonCount / JUDGING_SESSION_SIZE);
  return { completed, total: JUDGING_SESSION_SIZE, sessions };
}

/**
 * Check if judge has completed all possible pairs
 */
export async function hasExhaustedAllPairs(
  jamSlug: string,
  judgeId: string,
  entries: Entry[]
): Promise<boolean> {
  const totalPairs = getTotalPairCount(entries.length);
  const comparisonCount = await getComparisonCountForJudge(jamSlug, judgeId);
  return comparisonCount >= totalPairs;
}
