/**
 * Number of comparisons in a single judging session.
 */
export const JUDGING_SESSION_SIZE = 10;

export function getTotalPairCount(entryCount: number): number {
  if (entryCount < 2) {
    return 0;
  }

  return (entryCount * (entryCount - 1)) / 2;
}
