import { Comparison } from './database.js';
import { Entry } from './entries.js';

export interface RankedEntry {
  entry: Entry;
  score: number;
  rank: number;
}

export interface RankingStats {
  totalJudges: number;
  totalComparisons: number;
  skippedCount: number;
  coveragePercent: number;
}

/**
 * PageRank-style spectral ranking using power iteration.
 * Returns entries sorted by score (highest first).
 */
export function calculateRankings(entries: Entry[], comparisons: Comparison[]): RankedEntry[] {
  const n = entries.length;

  if (n === 0) {
    return [];
  }

  if (n === 1) {
    return [{ entry: entries[0], score: 100, rank: 1 }];
  }

  // Create entry ID to index mapping
  const idToIndex = new Map<string, number>();
  entries.forEach((entry, i) => {
    idToIndex.set(entry.id, i);
  });

  // Build transition matrix
  // matrix[i][j] = number of times entry i beat entry j
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  // Count wins from comparisons
  for (const comp of comparisons) {
    if (comp.score === null) continue; // Skip skipped comparisons

    const iA = idToIndex.get(comp.entry_a_id);
    const iB = idToIndex.get(comp.entry_b_id);

    if (iA === undefined || iB === undefined) continue;

    if (comp.score > 0.5) {
      // A wins
      matrix[iA][iB]++;
    } else if (comp.score < 0.5) {
      // B wins
      matrix[iB][iA]++;
    }
    // score === 0.5 would be a tie, don't count
  }

  // Check if we have any comparisons
  const hasComparisons = matrix.some((row) => row.some((val) => val > 0));
  if (!hasComparisons) {
    // No comparisons yet - all entries get neutral score
    return entries.map((entry, i) => ({
      entry,
      score: 50,
      rank: i + 1,
    }));
  }

  // Normalize columns to sum to 1 (with epsilon to avoid division by zero)
  const epsilon = 1e-10;
  const normalizedMatrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    let colSum = 0;
    for (let i = 0; i < n; i++) {
      colSum += matrix[i][j];
    }

    if (colSum > epsilon) {
      for (let i = 0; i < n; i++) {
        normalizedMatrix[i][j] = matrix[i][j] / colSum;
      }
    } else {
      // No wins against this entry - distribute evenly (teleportation)
      for (let i = 0; i < n; i++) {
        normalizedMatrix[i][j] = 1 / n;
      }
    }
  }

  // Power iteration to find principal eigenvector
  let vector = Array(n).fill(1 / n);
  const iterations = 100;

  for (let iter = 0; iter < iterations; iter++) {
    const newVector = Array(n).fill(0);

    // Matrix multiplication: newVector = matrix * vector
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newVector[i] += normalizedMatrix[i][j] * vector[j];
      }
    }

    // Normalize to sum to 1
    const sum = newVector.reduce((a, b) => a + b, 0);
    if (sum > epsilon) {
      for (let i = 0; i < n; i++) {
        newVector[i] /= sum;
      }
    }

    vector = newVector;
  }

  // Normalize scores to 0-100 range
  const maxScore = Math.max(...vector);
  const minScore = Math.min(...vector);
  const range = maxScore - minScore;

  const rankedEntries: RankedEntry[] = entries.map((entry, i) => {
    let score: number;
    if (range > epsilon) {
      score = ((vector[i] - minScore) / range) * 100;
    } else {
      score = 50; // All equal
    }
    return { entry, score, rank: 0 };
  });

  // Sort by score descending and assign ranks
  rankedEntries.sort((a, b) => b.score - a.score);
  rankedEntries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return rankedEntries;
}

/**
 * Calculate statistics for a set of comparisons
 */
export function calculateStats(entries: Entry[], comparisons: Comparison[]): RankingStats {
  const totalPairs = (entries.length * (entries.length - 1)) / 2;

  // Count unique judges
  const judges = new Set(comparisons.map((c) => c.judge_id));

  // Count skipped
  const skippedCount = comparisons.filter((c) => c.score === null).length;

  // Count pairs with at least one comparison
  const comparedPairs = new Set<string>();
  for (const comp of comparisons) {
    if (comp.score !== null) {
      const key =
        comp.entry_a_id < comp.entry_b_id
          ? `${comp.entry_a_id}:${comp.entry_b_id}`
          : `${comp.entry_b_id}:${comp.entry_a_id}`;
      comparedPairs.add(key);
    }
  }

  const coveragePercent = totalPairs > 0 ? (comparedPairs.size / totalPairs) * 100 : 0;

  return {
    totalJudges: judges.size,
    totalComparisons: comparisons.length,
    skippedCount,
    coveragePercent,
  };
}
