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

export const REVIEW_CONFIDENCE_THRESHOLD = 0.6;

// Anything severe or low-confidence goes to a person. See ADR 0003.
export function triageStatus(classifications: readonly Classification[]): ClaimStatus {
  if (classifications.length === 0) return 'open';
  const needsReview = classifications.some(
    (c) => c.severity === 'severe' || c.confidence < REVIEW_CONFIDENCE_THRESHOLD,
  );
  return needsReview ? 'needs_review' : 'triaged';
}
