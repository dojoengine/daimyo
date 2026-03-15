/**
 * Number of comparisons in a single judging session.
 */
export const JUDGING_SESSION_SIZE = 10;

/**
 * Minimum comparisons per entry before results are public.
 * Results are locked until totalComparisons >= entryCount * CONFIDENCE_N.
 */
export const CONFIDENCE_N = 12;

export function getTotalPairCount(entryCount: number): number {
  if (entryCount < 2) {
    return 0;
  }

  return (entryCount * (entryCount - 1)) / 2;
}
