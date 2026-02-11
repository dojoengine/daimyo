import { config } from 'dotenv';
import postgres from 'postgres';
import { getComparisonsForJamInRange } from '../services/database.js';
import { getEntries } from '../services/entries.js';
import { calculateRankings, calculateStats } from '../services/ranking.js';

// Load environment variables
config();

interface Args {
  jam: string;
  from?: string;
  to?: string;
}

function parseArgs(): Args {
  const args: Args = { jam: '' };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--jam' && process.argv[i + 1]) {
      args.jam = process.argv[++i];
    } else if (arg === '--from' && process.argv[i + 1]) {
      args.from = process.argv[++i];
    } else if (arg === '--to' && process.argv[i + 1]) {
      args.to = process.argv[++i];
    }
  }

  return args;
}

function parseDate(dateStr: string): number {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date.getTime();
}

async function main() {
  const args = parseArgs();

  if (!args.jam) {
    console.error('Usage: pnpm jam:rankings --jam <slug> [--from <date>] [--to <date>]');
    console.error('');
    console.error('Options:');
    console.error('  --jam   Jam slug (e.g., gj7) [required]');
    console.error('  --from  Start date (ISO format, e.g., 2026-01-15)');
    console.error('  --to    End date (ISO format, e.g., 2026-01-31)');
    process.exit(1);
  }

  // Initialize database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  // Monkey-patch the database module to use our SQL instance
  const dbModule = await import('../services/database.js');
  (dbModule as { setSql?: (s: typeof sql) => void }).setSql?.(sql);

  try {
    // Parse date range
    const fromTimestamp = args.from ? parseDate(args.from) : undefined;
    const toTimestamp = args.to ? parseDate(args.to) + 24 * 60 * 60 * 1000 - 1 : undefined; // End of day

    // Get entries and comparisons
    const entries = await getEntries(args.jam);
    const comparisons = await getComparisonsForJamInRange(args.jam, fromTimestamp, toTimestamp);

    if (entries.length === 0) {
      console.log(`No entries found for jam: ${args.jam}`);
      process.exit(0);
    }

    // Calculate rankings and stats
    const rankings = calculateRankings(entries, comparisons);
    const stats = calculateStats(entries, comparisons);

    // Print header
    console.log('');
    console.log(`Rankings for ${args.jam}`);

    if (args.from || args.to) {
      const fromStr = args.from || 'beginning';
      const toStr = args.to || 'now';
      console.log(`Comparisons: ${fromStr} to ${toStr}`);
    }

    console.log('');

    // Print rankings table
    console.log(' Rank  Score  PR#   Title                          Team');
    console.log(' ----  -----  ---   -----                          ----');

    for (const { entry, score, rank } of rankings) {
      const rankStr = rank.toString().padStart(4);
      const scoreStr = score.toFixed(1).padStart(5);
      const prStr = entry.id.padStart(3);
      const title =
        entry.title.length > 30 ? entry.title.slice(0, 27) + '...' : entry.title.padEnd(30);
      const team = entry.team.join(', ');

      console.log(`${rankStr}  ${scoreStr}  ${prStr}   ${title} ${team}`);
    }

    // Print statistics
    console.log('');
    console.log('Statistics:');
    console.log(`  Total judges: ${stats.totalJudges}`);
    console.log(`  Total comparisons: ${stats.totalComparisons}`);
    console.log(`  Skipped: ${stats.skippedCount}`);
    console.log(`  Coverage: ${stats.coveragePercent.toFixed(0)}% of pairs have ≥1 comparison`);
    console.log('');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
