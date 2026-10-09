import { createHash } from 'node:crypto';
import { DAMAGE_TYPES, SEVERITIES } from '../src/domain/classification';
import { MockVisionProvider } from '../src/vision/mock-vision.provider';

const input = (s: string) => {
  const bytes = Buffer.from(s);
  return { bytes, mimeType: 'image/jpeg', sha256: createHash('sha256').update(bytes).digest('hex') };
};

describe('MockVisionProvider', () => {
  const provider = new MockVisionProvider();

  it('is deterministic for the same image', async () => {
    expect(await provider.classify(input('a'))).toEqual(await provider.classify(input('a')));
  });

  it('always returns a valid classification', async () => {
    for (let i = 0; i < 200; i++) {
      const r = await provider.classify(input(`img-${i}`));
      expect(DAMAGE_TYPES).toContain(r.damageType);
      expect(SEVERITIES).toContain(r.severity);
      expect(r.confidence).toBeGreaterThanOrEqual(0.4);
      expect(r.confidence).toBeLessThanOrEqual(0.99);
      if (r.damageType === 'none') expect(r.severity).toBe('none');
      expect(r.provider).toBe('mock');
    }
  });
});
