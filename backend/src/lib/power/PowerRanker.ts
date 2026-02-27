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

export interface SelectOptions {
  num?: number;
  exclude?: Set<string>;
  impact?: boolean;
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

    // Set diagonals to column sums (excluding diagonal), representing total preference received
    const colSums = matrix.sum('column');
    for (let i = 0; i < this.items.length; i++) {
      matrix.set(i, i, colSums[i] - matrix.get(i, i));
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
   * With impact: true, weights are variance * weight_a * weight_b,
   * prioritizing uncertain pairs between high-ranked items.
   * Optionally excludes pairs (e.g. already judged).
   */
  select({ num, exclude, impact }: SelectOptions = {}): PairWeight[] {
    const allVariances = this.getVariances();

    // Compute impact weights if requested
    let weights: Map<string, number> | undefined;
    if (impact) {
      weights = this.run();
    }

    // Build candidate pool with sampling weights
    const candidates: PairWeight[] = [];

    for (const v of allVariances) {
      if (exclude && exclude.has(pairKey(v.alpha, v.beta))) continue;

      let weight = v.weight;
      if (weights) {
        weight *= weights.get(v.alpha)! * weights.get(v.beta)!;
      }
      candidates.push({ alpha: v.alpha, beta: v.beta, weight });
    }

    // Without num, return all candidates
    if (num === undefined) {
      return candidates;
    }

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

      const pair = remaining[idx];
      selected.push({ alpha: pair.alpha, beta: pair.beta, weight: pair.weight });
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
        mat.setRow(
          i,
          mat.getRow(i).map((v) => v / rowSums[i])
        );
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
}
