import { Classification } from '../domain/classification';

export interface ImageInput {
  bytes: Buffer;
  mimeType: string;
  sha256: string;
}

// See ADR 0002.
export interface VisionProvider {
  readonly name: string;
  classify(image: ImageInput): Promise<Classification>;
}

export const VISION_PROVIDER = Symbol('VISION_PROVIDER');
