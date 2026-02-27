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

export interface PairVariance {
  alpha: string;
  beta: string;
  variance: number;
}

export interface SelectedPair {
  alpha: string;
  beta: string;
}

export interface SelectOptions {
  num: number;
  exclude?: Set<string>;
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
  items: string[];
  options: PowerRankerOptions;
  matrix: Matrix;

  private itemMap: Map<string, number>;

  constructor({ items, options = {} }: { items: Set<string>; options?: PowerRankerOptions }) {
    if (items.size < 2) {
      throw new Error('PowerRanker: Cannot rank less than two items');
    }

    this.options = options;
    this.items = Array.from(items).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    this.itemMap = new Map(this.items.map((item, ix) => [item, ix]));
    this.matrix = this.prepareMatrix();

    this.log('Matrix initialized');
  }

  log(msg: string): void {
    if (this.options.verbose) {
      console.log(msg);
    }
  }

  /**
   * Add preferences to the matrix.
   * We assume max one submission per participant/pair.
   */
  addPreferences(preferences: Preference[]): void {
    const matrix = this.matrix;

    for (const p of preferences) {
      const targetIx = this.itemMap.get(p.target);
      const sourceIx = this.itemMap.get(p.source);

      if (targetIx === undefined || sourceIx === undefined) continue;

      // Scale so 0.5 -> 0, 0.7 -> 0.4, etc.
      const scaled = (p.value - 0.5) * 2;

      // Rows: source, cols: target
      if (scaled > 0) {
        matrix.set(sourceIx, targetIx, matrix.get(sourceIx, targetIx) + scaled);
      } else {
        matrix.set(targetIx, sourceIx, matrix.get(targetIx, sourceIx) + -scaled);
      }
    }

    // Add the diagonals (sums of columns, representing sum preference received)
    for (let i = 0; i < this.items.length; i++) {
      let colSum = 0;
      for (let j = 0; j < this.items.length; j++) {
        if (j !== i) {
          colSum += matrix.get(j, i);
        }
      }
      matrix.set(i, i, colSum);
    }
  }

  /**
   * Run the algorithm and return the results.
   */
  run({ epsilon = 0.001, nIter = 1000 }: RunOptions = {}): Map<string, number> {
    const weights = this.powerMethod(epsilon, nIter);
    return this.applyLabels(weights);
  }

  /**
   * Generate the Beta variance per pair.
   */
  getVariances(): PairVariance[] {
    const variances: PairVariance[] = [];

    for (let i = 0; i < this.items.length; i++) {
      for (let j = i + 1; j < this.items.length; j++) {
        const variance = this.getVariance(i, j);
        variances.push({ alpha: this.items[i], beta: this.items[j], variance });
      }
    }

    return variances;
  }

  /**
   * Select pairs for a judging session via variance-weighted sampling.
   *
   * Samples without replacement, weighted by Beta-distribution variance.
   * Optionally excludes pairs (e.g. already judged).
   */
  select({ num, exclude }: SelectOptions): SelectedPair[] {
    const allVariances = this.getVariances();

    const candidates = exclude
      ? allVariances.filter((v) => !exclude.has(pairKey(v.alpha, v.beta)))
      : allVariances;

    const remaining = [...candidates];
    const selected: SelectedPair[] = [];

    for (let pick = 0; pick < num && remaining.length > 0; pick++) {
      const totalVariance = remaining.reduce((sum, p) => sum + p.variance, 0);

      let idx: number;
      if (totalVariance > 0) {
        let random = Math.random() * totalVariance;
        idx = remaining.length - 1;
        for (let k = 0; k < remaining.length; k++) {
          random -= remaining[k].variance;
          if (random <= 0) {
            idx = k;
            break;
          }
        }
      } else {
        idx = Math.floor(Math.random() * remaining.length);
      }

      const pair = remaining[idx];
      selected.push({ alpha: pair.alpha, beta: pair.beta });
      remaining.splice(idx, 1);
    }

    return selected;
  }

  // Internal

  private applyLabels(eigenvector: number[]): Map<string, number> {
    if (this.itemMap.size !== eigenvector.length) {
      throw new Error('Mismatched arguments!');
    }

    const result = new Map<string, number>();
    for (const [item, ix] of this.itemMap) {
      result.set(item, eigenvector[ix]);
    }
    return result;
  }

  private prepareMatrix(): Matrix {
    const n = this.items.length;
    let matrix = Matrix.zeros(n, n);

    // Initialize off-diagonals with pseudocount k
    if (this.options.k) {
      const k = this.options.k;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            matrix.set(i, j, k);
          }
        }
      }
    }

    return matrix;
  }

  private powerMethod(epsilon: number, nIter: number): number[] {
    const n = this.items.length;
    const mat = this.matrix.clone();

    // Row-normalize
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += mat.get(i, j);
      }
      if (rowSum > 0) {
        for (let j = 0; j < n; j++) {
          mat.set(i, j, mat.get(i, j) / rowSum);
        }
      } else {
        // Give zero-sum rows uniform distribution
        for (let j = 0; j < n; j++) {
          mat.set(i, j, 1 / n);
        }
      }
    }

    // Power iteration with L2 convergence check
    let vec = Array(n).fill(1 / n);

    for (let iter = 0; iter < nIter; iter++) {
      // Row-vector × matrix: next[j] = sum_i(vec[i] * mat[i][j])
      const next = Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          next[j] += vec[i] * mat.get(i, j);
        }
      }

      // Check convergence (L2 norm of difference)
      let norm = 0;
      for (let i = 0; i < n; i++) {
        norm += (next[i] - vec[i]) ** 2;
      }

      vec = next;
      if (Math.sqrt(norm) < epsilon) {
        this.log(`Eigenvector convergence after ${iter} iterations`);
        break;
      }
    }

    return vec;
  }

  private getVariance(i: number, j: number): number {
    // Model as a Beta distribution with a (1, 1) prior
    const a = this.matrix.get(i, j) + 1;
    const b = this.matrix.get(j, i) + 1;

    return (a * b) / ((a + b + 1) * (a + b) ** 2);
  }
}
