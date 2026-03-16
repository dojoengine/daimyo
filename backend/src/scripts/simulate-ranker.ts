/**
 * Simulate a full judging process and evaluate weight recovery.
 *
 * Generates items with power-law true weights, simulates judges voting
 * in sessions with activeSelect pair selection, then compares recovered
 * weights against truth.
 *
 * Usage:
 *   npx tsx backend/src/scripts/simulate-ranker.ts [options]
 *
 * Options:
 *   --items <n>       Number of items (default: 20)
 *   --alpha <a>       Power-law exponent controlling tail fatness (default: 1.5)
 *                     Higher = more spread between top and bottom items
 *   --judges <j>      Number of judges (default: 10)
 *   --sessions <s>    Sessions per judge (default: 3)
 *   --ssize <sz>      Votes per session (default: 10)
 *   --trials <t>      Number of simulation trials (default: 50)
 *   --prior <c>       Prior strength constant (default: 1)
 *   --r <r>           Active select power transform (0–1, default: 0.9)
 *   --select <t1,t2>  Active select terms (default: coverage,proximity,position)
 *   --noise <n>       Vote noise amplitude (default: 0.3)
 *   --continuous      Use continuous BT scores instead of Likert binning
 *
 * Example:
 *   npx tsx backend/src/scripts/simulate-ranker.ts --items 30 --judges 10 --sessions 4 --alpha 1.5
 */

import { PowerRanker, pairKey } from '../lib/power/index.js';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      opts[key] = args[i + 1] ?? 'true';
      i++;
    }
  }
  return {
    nItems: parseInt(opts['items'] ?? '20'),
    alpha: parseFloat(opts['alpha'] ?? '1.5'),
    nJudges: parseInt(opts['judges'] ?? '10'),
    nSessions: parseInt(opts['sessions'] ?? '3'),
    sessionSize: parseInt(opts['ssize'] ?? '10'),
    nTrials: parseInt(opts['trials'] ?? '50'),
    priorC: parseFloat(opts['prior'] ?? '1'),
    r: parseFloat(opts['r'] ?? '0.9'),
    terms: (opts['select'] ?? 'coverage,proximity,position').split(',') as (
      | 'coverage'
      | 'proximity'
      | 'position'
    )[],
    noise: parseFloat(opts['noise'] ?? '0.3'),
    continuous: 'continuous' in opts,
  };
}

// ---------------------------------------------------------------------------
// Weight generation
// ---------------------------------------------------------------------------

/** Power-law weights: w_i = (i / n)^alpha, normalized to sum to 1.
 *  alpha controls tail fatness — higher means more spread. */
function generateTrueWeights(n: number, alpha: number): number[] {
  const raw = Array.from({ length: n }, (_, i) => Math.pow((i + 1) / n, alpha));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

// ---------------------------------------------------------------------------
// Vote simulation (Bradley-Terry → Likert)
// ---------------------------------------------------------------------------

/** Draw a score for A vs B given their true weights.
 *  continuous=false: Bradley-Terry + noise, binned to {0, 0.25, 0.5, 0.75, 1.0}.
 *  continuous=true: raw Bradley-Terry probability with noise, clamped to [0, 1]. */
function drawScore(wA: number, wB: number, noise: number, continuous: boolean): number {
  const pA = wA / (wA + wB);
  const noisy = pA + (Math.random() - 0.5) * noise;
  const clamped = Math.max(0, Math.min(1, noisy));
  return continuous ? clamped : Math.round(clamped * 4) / 4;
}

// ---------------------------------------------------------------------------
// Correlation metrics
// ---------------------------------------------------------------------------

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0,
    dA = 0,
    dB = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - meanA) * (b[i] - meanB);
    dA += (a[i] - meanA) ** 2;
    dB += (b[i] - meanB) ** 2;
  }
  return dA > 0 && dB > 0 ? num / Math.sqrt(dA * dB) : 0;
}

function rankArray(arr: number[]): number[] {
  const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const ranks = new Array(arr.length);
  sorted.forEach((el, rank) => {
    ranks[el.i] = rank + 1;
  });
  return ranks;
}

function spearman(a: number[], b: number[]): number {
  const n = a.length;
  const rA = rankArray(a);
  const rB = rankArray(b);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rA[i] - rB[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

function kendallTau(a: number[], b: number[]): number {
  const n = a.length;
  let concordant = 0,
    discordant = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const aSign = Math.sign(a[i] - a[j]);
      const bSign = Math.sign(b[i] - b[j]);
      if (aSign * bSign > 0) concordant++;
      else if (aSign * bSign < 0) discordant++;
    }
  }
  const pairs = (n * (n - 1)) / 2;
  return (concordant - discordant) / pairs;
}

/** L2 error between normalized weight vectors */
function weightError(truth: number[], recovered: number[]): number {
  let sumSq = 0;
  for (let i = 0; i < truth.length; i++) {
    sumSq += (truth[i] - recovered[i]) ** 2;
  }
  return Math.sqrt(sumSq);
}

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

interface SimResult {
  pearson: number;
  spearman: number;
  kendall: number;
  l2Error: number;
  spreadRatio: number; // recovered spread / true spread
  uniquePairs: number;
  totalPairs: number;
}

function runTrial(
  nItems: number,
  alpha: number,
  nJudges: number,
  nSessions: number,
  sessionSize: number,
  priorC: number,
  r: number,
  terms: ('coverage' | 'proximity' | 'position')[],
  noise: number,
  continuous: boolean
): SimResult {
  const trueWeights = generateTrueWeights(nItems, alpha);
  const itemIds = Array.from({ length: nItems }, (_, i) => `item-${i}`);
  const trueSpread = Math.max(...trueWeights) / Math.min(...trueWeights);

  // Accumulate all comparisons
  const allPrefs: { target: string; source: string; value: number }[] = [];
  const judgeExclusions: Map<string, Set<string>> = new Map();

  for (let judge = 0; judge < nJudges; judge++) {
    const judgeId = `judge-${judge}`;
    if (!judgeExclusions.has(judgeId)) {
      judgeExclusions.set(judgeId, new Set());
    }
    const exclude = judgeExclusions.get(judgeId)!;

    for (let session = 0; session < nSessions; session++) {
      // Build ranker with current data to select pairs
      const k = priorC / nItems;
      const items = new Set(itemIds);
      const ranker = new PowerRanker({ items, options: { k } });

      if (allPrefs.length > 0) {
        ranker.addPreferences(allPrefs);
      }

      // Select pairs via activeSelect
      const pairs = ranker.activeSelect({
        num: sessionSize,
        exclude,
        terms,
        r,
      });

      // Simulate votes
      for (const pair of pairs) {
        const iA = parseInt(pair.alpha.split('-')[1]);
        const iB = parseInt(pair.beta.split('-')[1]);
        const score = drawScore(trueWeights[iA], trueWeights[iB], noise, continuous);

        allPrefs.push({ target: pair.alpha, source: pair.beta, value: score });
        exclude.add(pairKey(pair.alpha, pair.beta));
      }
    }
  }

  // Count unique pairs observed
  const pairSet = new Set(allPrefs.map((p) => pairKey(p.target, p.source)));
  const totalPossiblePairs = (nItems * (nItems - 1)) / 2;

  // Final ranking
  const k = priorC / nItems;
  const finalRanker = new PowerRanker({ items: new Set(itemIds), options: { k } });
  if (allPrefs.length > 0) {
    finalRanker.addPreferences(allPrefs);
  }
  const weights = finalRanker.run();
  const recovered = itemIds.map((id) => weights.get(id)!);

  const recSpread = Math.max(...recovered) / Math.min(...recovered);

  return {
    pearson: pearson(trueWeights, recovered),
    spearman: spearman(trueWeights, recovered),
    kendall: kendallTau(trueWeights, recovered),
    l2Error: weightError(trueWeights, recovered),
    spreadRatio: recSpread / trueSpread,
    uniquePairs: pairSet.size,
    totalPairs: totalPossiblePairs,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function reportResults(label: string, results: SimResult[]) {
  const p = results.map((r) => r.pearson);
  const s = results.map((r) => r.spearman);
  const k = results.map((r) => r.kendall);
  const e = results.map((r) => r.l2Error);
  const sr = results.map((r) => r.spreadRatio);

  const up = results.map((r) => r.uniquePairs);
  const tp = results[0].totalPairs;
  const pairCoverage = avg(up) / tp;

  console.log(
    `  ${label.padEnd(12)} ` +
      `pearson=${avg(p).toFixed(3)}  ` +
      `spearman=${avg(s).toFixed(3)}  ` +
      `kendall=${avg(k).toFixed(3)}  ` +
      `L2err=${avg(e).toFixed(4)}  ` +
      `spread=${avg(sr).toFixed(2)}x  ` +
      `(med spread=${median(sr).toFixed(2)}x)`
  );
  console.log(
    `               ` +
      `pairs=${avg(up).toFixed(0)}/${tp} (${(pairCoverage * 100).toFixed(0)}% coverage)`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const opts = parseArgs();

const totalVotes = opts.nJudges * opts.nSessions * opts.sessionSize;
const votesPerItem = totalVotes / opts.nItems;
const trueWeights = generateTrueWeights(opts.nItems, opts.alpha);
const trueSpread = Math.max(...trueWeights) / Math.min(...trueWeights);

const k = opts.priorC / opts.nItems;

console.log('=== Ranker Simulation ===');
console.log(
  `  Items: ${opts.nItems}  Alpha: ${opts.alpha}  True spread: ${trueSpread.toFixed(1)}x`
);
console.log(
  `  Judges: ${opts.nJudges}  Sessions: ${opts.nSessions}  ` +
    `Session size: ${opts.sessionSize}  Total votes: ${totalVotes}`
);
console.log(`  Votes per item (avg): ${votesPerItem.toFixed(1)}`);
console.log(`  Prior: C=${opts.priorC}  k=${k.toFixed(4)}`);
console.log(`  Active select: ${opts.terms.join(', ')}  r=${opts.r}`);
console.log(`  Noise: ${opts.noise}  Scoring: ${opts.continuous ? 'continuous' : 'likert'}`);
console.log(`  Trials: ${opts.nTrials}\n`);

const results: SimResult[] = [];
for (let t = 0; t < opts.nTrials; t++) {
  results.push(
    runTrial(
      opts.nItems,
      opts.alpha,
      opts.nJudges,
      opts.nSessions,
      opts.sessionSize,
      opts.priorC,
      opts.r,
      opts.terms,
      opts.noise,
      opts.continuous
    )
  );
}
reportResults(`C=${opts.priorC}`, results);
