import {
  Classification,
  DEFAULT_TRIAGE_POLICY,
  triagePolicyFromEnv,
  triageStatus,
} from '../src/domain/classification';

const c = (over: Partial<Classification>): Classification => ({
  damageType: 'water',
  severity: 'minor',
  confidence: 0.9,
  notes: '',
  provider: 'test',
  ...over,
});

const noDamage = (confidence = 0.9) => c({ damageType: 'none', severity: 'none', confidence });

describe('triageStatus', () => {
  it('keeps a claim with no photos open', () => {
    expect(triageStatus([])).toBe('open');
  });

  it('triages confident, non-severe damage automatically', () => {
    expect(triageStatus([c({}), c({ damageType: 'storm', severity: 'moderate' })])).toBe('triaged');
  });

  it('sends any severe photo to review', () => {
    expect(triageStatus([c({}), c({ severity: 'severe' })])).toBe('needs_review');
  });

  it('sends low-confidence damage to review', () => {
    expect(triageStatus([c({ confidence: 0.59 })])).toBe('needs_review');
  });

  it('treats the threshold itself as confident enough', () => {
    expect(triageStatus([c({ confidence: 0.6 })])).toBe('triaged');
  });

  it('always reviews fire damage, even when minor and confident', () => {
    expect(triageStatus([c({ damageType: 'fire', severity: 'minor', confidence: 0.99 })])).toBe('needs_review');
  });

  it('ignores the confidence of photos that show no damage', () => {
    expect(triageStatus([c({}), noDamage(0.41)])).toBe('triaged');
  });

  it('reviews a claim where no photo shows any damage', () => {
    expect(triageStatus([noDamage(), noDamage()])).toBe('needs_review');
  });

  it('uses the threshold from the policy it is given', () => {
    const strict = { ...DEFAULT_TRIAGE_POLICY, reviewConfidenceThreshold: 0.95 };
    expect(triageStatus([c({ confidence: 0.9 })], strict)).toBe('needs_review');
  });
});

describe('triagePolicyFromEnv', () => {
  it('falls back to the default when unset', () => {
    expect(triagePolicyFromEnv({})).toEqual(DEFAULT_TRIAGE_POLICY);
  });

  it('reads the threshold', () => {
    expect(triagePolicyFromEnv({ REVIEW_CONFIDENCE_THRESHOLD: '0.75' }).reviewConfidenceThreshold).toBe(0.75);
  });

  it.each(['abc', '-0.1', '1.5'])('refuses to start with an invalid threshold (%s)', (raw) => {
    expect(() => triagePolicyFromEnv({ REVIEW_CONFIDENCE_THRESHOLD: raw })).toThrow(/between 0 and 1/);
  });
});
