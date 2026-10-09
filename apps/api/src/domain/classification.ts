export const DAMAGE_TYPES = ['water', 'fire', 'storm', 'impact', 'mould', 'none'] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const SEVERITIES = ['none', 'minor', 'moderate', 'severe'] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface Classification {
  damageType: DamageType;
  severity: Severity;
  confidence: number; // 0..1
  notes: string;
  provider: string; // kept so old results stay traceable after switching models
}

export type ClaimStatus = 'open' | 'triaged' | 'needs_review';

export interface TriagePolicy {
  reviewConfidenceThreshold: number;
  alwaysReviewTypes: readonly DamageType[];
}

export const DEFAULT_TRIAGE_POLICY: TriagePolicy = {
  reviewConfidenceThreshold: 0.6,
  // fire: smoke/structural/electrical damage rarely shows fully in a photo
  alwaysReviewTypes: ['fire'],
};

// See ADR 0003.
export function triageStatus(
  classifications: readonly Classification[],
  policy: TriagePolicy = DEFAULT_TRIAGE_POLICY,
): ClaimStatus {
  if (classifications.length === 0) return 'open';

  // 'none' photos are often context shots (front of house etc), so their
  // confidence doesn't matter. But if nothing shows damage at all, someone should look.
  const damaged = classifications.filter((c) => c.damageType !== 'none');
  if (damaged.length === 0) return 'needs_review';

  const needsReview = damaged.some(
    (c) =>
      c.severity === 'severe' ||
      c.confidence < policy.reviewConfidenceThreshold ||
      policy.alwaysReviewTypes.includes(c.damageType),
  );
  return needsReview ? 'needs_review' : 'triaged';
}

export function triagePolicyFromEnv(env: NodeJS.ProcessEnv = process.env): TriagePolicy {
  const raw = env.REVIEW_CONFIDENCE_THRESHOLD;
  if (raw === undefined || raw === '') return DEFAULT_TRIAGE_POLICY;

  const threshold = Number(raw);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error(`REVIEW_CONFIDENCE_THRESHOLD must be a number between 0 and 1, got "${raw}"`);
  }
  return { ...DEFAULT_TRIAGE_POLICY, reviewConfidenceThreshold: threshold };
}
