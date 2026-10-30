// Exam scoring. SAA-C03 reports 100–1000 with 720 to pass. The real scale is not public;
// ponytail: piecewise-linear estimate anchored at ~70% raw ≈ 720, good enough as a readiness signal.
export const PASS = 720;
export const DOMAIN_WEIGHTS = { secure: 0.3, resilient: 0.26, performance: 0.24, cost: 0.2 } as const;

export function scaledScore(rawFraction: number): number {
  const f = Math.min(1, Math.max(0, rawFraction));
  return Math.round(f <= 0.7 ? 100 + (f / 0.7) * 620 : 720 + ((f - 0.7) / 0.3) * 280);
}
