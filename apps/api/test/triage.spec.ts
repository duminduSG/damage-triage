import { Classification, triageStatus } from '../src/domain/classification';

const c = (over: Partial<Classification>): Classification => ({
  damageType: 'water',
  severity: 'minor',
  confidence: 0.9,
  notes: '',
  provider: 'test',
  ...over,
});

describe('triageStatus', () => {
  it('keeps a claim with no photos open', () => {
    expect(triageStatus([])).toBe('open');
  });

  it('triages confident, non-severe results automatically', () => {
    expect(triageStatus([c({}), c({ damageType: 'storm', severity: 'moderate' })])).toBe('triaged');
  });

  it('sends any severe photo to a human', () => {
    expect(triageStatus([c({}), c({ severity: 'severe' })])).toBe('needs_review');
  });

  it('sends low-confidence results to a human', () => {
    expect(triageStatus([c({ confidence: 0.59 })])).toBe('needs_review');
  });

  it('treats the threshold itself as confident enough', () => {
    expect(triageStatus([c({ confidence: 0.6 })])).toBe('triaged');
  });
});
