import { randomUUID } from 'crypto';
import { getSql } from './connection.js';

/**
 * Judging-focused database query helpers.
 */
function parseCount(value: string | undefined): number {
  return parseInt(value || '0', 10);
}

export interface Comparison {
  id: string;
  jam_slug: string;
  judge_id: string;
  entry_a_id: string;
  entry_b_id: string;
  score: number | null;
  timestamp: number;
}

/**
 * Insert a new comparison.
 * Entry IDs are canonicalized (smaller ID first).
 */
export async function insertComparison(
  jamSlug: string,
  judgeId: string,
  entryAId: string,
  entryBId: string,
  score: number | null
): Promise<void> {
  const sql = getSql();
  const id = randomUUID();
  const timestamp = Date.now();

  const [canonA, canonB, canonScore] =
    entryAId < entryBId
      ? [entryAId, entryBId, score]
      : [entryBId, entryAId, score !== null ? 1.0 - score : null];

  await sql`
    INSERT INTO jam_comparisons (id, jam_slug, judge_id, entry_a_id, entry_b_id, score, timestamp)
    VALUES (${id}, ${jamSlug}, ${judgeId}, ${canonA}, ${canonB}, ${canonScore}, ${timestamp})
  `;
}

/**
 * Get all comparisons for a jam.
 */
export async function getComparisonsForJam(jamSlug: string): Promise<Comparison[]> {
  const sql = getSql();

  const results = await sql<Comparison[]>`
    SELECT id, jam_slug, judge_id, entry_a_id, entry_b_id, score, timestamp
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get comparisons for a jam within a date range.
 */
export async function getComparisonsForJamInRange(
  jamSlug: string,
  fromTimestamp?: number,
  toTimestamp?: number
): Promise<Comparison[]> {
  const sql = getSql();
  const from = fromTimestamp || 0;
  const to = toTimestamp || Date.now();

  const results = await sql<Comparison[]>`
    SELECT id, jam_slug, judge_id, entry_a_id, entry_b_id, score, timestamp
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
    AND timestamp >= ${from}
    AND timestamp <= ${to}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get count of comparisons for a judge in a jam.
 */
export async function getComparisonCountForJudge(
  jamSlug: string,
  judgeId: string
): Promise<number> {
  const sql = getSql();

  const results = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
    AND judge_id = ${judgeId}
  `;

  return parseCount(results[0]?.count);
}

/**
 * Get unique judge count for a jam.
 */
export async function getUniqueJudgeCount(jamSlug: string): Promise<number> {
  const sql = getSql();

  const results = await sql<{ count: string }[]>`
    SELECT COUNT(DISTINCT judge_id) as count
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
  `;

  return parseCount(results[0]?.count);
}
