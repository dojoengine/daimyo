import { Matrix } from 'ml-matrix';

export interface PowerRankerOptions {
  k?: number;
  verbose?: boolean;
}

export interface Preference {
  target: string;
  source: string;
  value: number;
}

export interface RunOptions {
  epsilon?: number;
  nIter?: number;
}

export interface PairWeight {
  alpha: string;
  beta: string;
  weight: number;
}

export type ImpactTransform = 'weight' | 'coverage';

export interface SelectOptions {
  num?: number;
  exclude?: Set<string>;
  impact?: ImpactTransform[];
}

/**
 * Canonical pair key for a sorted (alpha, beta) pair.
 */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * PageRank-style spectral ranker using power iteration.
 *
 * Ported from zaratanDotWorld/choreWheel src/lib/power.js.
 * Uses Bayesian pseudocounts (k) for regularization instead of damping.
 */
export class PowerRanker {
  readonly items: string[];
  private options: PowerRankerOptions;
  private matrix: Matrix;
  private itemIndices: Record<string, number>;
  private itemObservations: Record<string, number>;

  constructor({ items, options = {} }: { items: Set<string>; options?: PowerRankerOptions }) {
    if (items.size < 2) {
      throw new Error('PowerRanker: Cannot rank less than two items');
    }

    this.options = options;
    this.items = Array.from(items).sort((a, b) => a.localeCompare(b));
    this.itemIndices = Object.fromEntries(this.items.map((item, ix) => [item, ix]));
    this.itemObservations = Object.fromEntries(this.items.map((item) => [item, 0]));
    this.matrix = this.prepareMatrix();

    this.log('Matrix initialized');
  }

  private log(msg: string): void {
    if (this.options.verbose) {
      console.log(msg);
    }
  }

  /**
   * Add preferences to the matrix.
   * We assume max one submission per participant/pair.
   */
  addPreferences(preferences: Preference[]): void {
    const d = (this.matrix as unknown as { data: Float64Array[] }).data;

    for (const p of preferences) {
      const targetIx = this.itemIndices[p.target];
      const sourceIx = this.itemIndices[p.source];
      if (targetIx === undefined || sourceIx === undefined) continue;

      // Track observations for both items (regardless of score)
      this.itemObservations[p.target]++;
      this.itemObservations[p.source]++;

      // Scale so 0.5 -> 0, 0.7 -> 0.4, etc.
      const scaled = (p.value - 0.5) * 2;

      // Rows: source, cols: target
      if (scaled > 0) {
        d[sourceIx][targetIx] += scaled;
      } else {
        d[targetIx][sourceIx] -= scaled;
      }
    }

    // Set diagonals to column sums (excluding diagonal), representing total preference received
    const colSums = this.matrix.sum('column');
    for (let i = 0; i < this.items.length; i++) {
      d[i][i] = colSums[i] - d[i][i];
    }
  }

  /**
   * Run the algorithm and return the results.
   */
  run({ epsilon = 0.001, nIter = 1000 }: RunOptions = {}): Map<string, number> {
    const weights = this.powerMethod(epsilon, nIter);
    return this.applyLabels(weights);
  }

  private getVariances(): PairWeight[] {
    const variances: PairWeight[] = [];

    for (let i = 0; i < this.items.length; i++) {
      for (let j = i + 1; j < this.items.length; j++) {
        const weight = this.getVariance(i, j);
        variances.push({ alpha: this.items[i], beta: this.items[j], weight });
      }
    }

    return variances;
  }

  /**
   * Select pairs via variance-weighted sampling.
   *
   * With num specified, samples without replacement weighted by variance.
   * Without num, returns all pairs with their weights (useful for diagnostics).
   * impact is an optional array of transforms applied multiplicatively:
   *   - 'weight': multiply by posterior rank weights (upsamples high-ranked pairs)
   *   - 'coverage': multiply by 1/(1+n/N) per item (upsamples under-observed items)
   * Optionally excludes pairs (e.g. already judged).
   */
  select({ num, exclude, impact }: SelectOptions = {}): PairWeight[] {
    const variances = this.getVariances();
    const transforms = impact ?? [];

    const weights = transforms.includes('weight') ? this.run() : new Map<string, number>();

    // Build candidate pool with sampling weights
    const candidates: PairWeight[] = [];

    for (const v of variances) {
      if (exclude && exclude.has(pairKey(v.alpha, v.beta))) {
        continue;
      }

      let weight = v.weight;

      if (transforms.includes('weight')) {
        weight *= weights.get(v.alpha)! * weights.get(v.beta)!;
      }

      if (transforms.includes('coverage')) {
        const nAlpha = this.itemObservations[v.alpha] ?? 0;
        const nBeta = this.itemObservations[v.beta] ?? 0;
        weight *= (1 / Math.sqrt(1 + nAlpha)) * (1 / Math.sqrt(1 + nBeta));
      }

      candidates.push({ alpha: v.alpha, beta: v.beta, weight });
    }

    // Without num, return all candidates
    if (num === undefined) {
      return candidates;
    } else {
      return this.selectWithoutReplacement(candidates, num);
    }
  }

  // Internal

  private applyLabels(eigenvector: number[]): Map<string, number> {
    if (this.items.length !== eigenvector.length) {
      throw new Error('Mismatched arguments!');
    }

    const result = new Map<string, number>();
    for (let ix = 0; ix < this.items.length; ix++) {
      result.set(this.items[ix], eigenvector[ix]);
    }
    return result;
  }

  private prepareMatrix(): Matrix {
    const n = this.items.length;

    if (this.options.k) {
      // Off-diagonals filled with pseudocount k, diagonal stays 0
      return Matrix.ones(n, n).sub(Matrix.eye(n)).mul(this.options.k);
    }

    return Matrix.zeros(n, n);
  }

  private powerMethod(epsilon: number, nIter: number): number[] {
    const n = this.items.length;
    const mat = this.matrix.clone();

    // Row-normalize
    const rowSums = mat.sum('row');
    for (let i = 0; i < n; i++) {
      if (rowSums[i] > 0) {
        // prettier-ignore
        mat.setRow(i, mat.getRow(i).map((v) => v / rowSums[i]));
      } else {
        mat.setRow(i, Array(n).fill(1 / n));
      }
    }

    // Power iteration with L2 convergence check
    let vec = Matrix.rowVector(Array(n).fill(1 / n));
    let prev = vec;

    for (let iter = 0; iter < nIter; iter++) {
      vec = prev.mmul(mat);

      if (Matrix.sub(vec, prev).norm() < epsilon) {
        this.log(`Eigenvector convergence after ${iter} iterations`);
        break;
      }

      prev = vec;
    }

    return vec.getRow(0);
  }

  private getVariance(i: number, j: number): number {
    // Model as a Beta distribution with a (1, 1) prior
    const a = this.matrix.get(i, j) + 1;
    const b = this.matrix.get(j, i) + 1;

    return (a * b) / ((a + b + 1) * (a + b) ** 2);
  }

  private selectWithoutReplacement(candidates: PairWeight[], num: number): PairWeight[] {
    // Weighted sampling without replacement
    const remaining = [...candidates];
    const selected: PairWeight[] = [];

    for (let pick = 0; pick < num && remaining.length > 0; pick++) {
      const totalWeight = remaining.reduce((sum, p) => sum + p.weight, 0);

      let idx: number;
      if (totalWeight > 0) {
        let random = Math.random() * totalWeight;
        idx = remaining.length - 1;
        for (let k = 0; k < remaining.length; k++) {
          random -= remaining[k].weight;
          if (random <= 0) {
            idx = k;
            break;
          }
        }
      } else {
        idx = Math.floor(Math.random() * remaining.length);
      }

      selected.push(remaining[idx]);
      remaining.splice(idx, 1);
    }

    return selected;
  }
}
