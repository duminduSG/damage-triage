import { Injectable } from '@nestjs/common';
import { Classification, DAMAGE_TYPES, SEVERITIES } from '../domain/classification';
import { ImageInput, VisionProvider } from './vision-provider';

// Fake classifier for dev/tests. Derived from the image hash so the same photo
// always gets the same answer.
@Injectable()
export class MockVisionProvider implements VisionProvider {
  readonly name = 'mock';

  async classify(image: ImageInput): Promise<Classification> {
    const byte = (i: number) => parseInt(image.sha256.slice(i * 2, i * 2 + 2), 16);

    const damageType = DAMAGE_TYPES[byte(0) % DAMAGE_TYPES.length];
    const severity = damageType === 'none' ? 'none' : SEVERITIES[1 + (byte(1) % 3)];
    // 0.40 - 0.99, so some results fall under the review threshold
    const confidence = Math.round((0.4 + (byte(2) / 255) * 0.59) * 100) / 100;

    return {
      damageType,
      severity,
      confidence,
      notes: `Mock classification (deterministic from image hash ${image.sha256.slice(0, 8)}).`,
      provider: this.name,
    };
  }
}
