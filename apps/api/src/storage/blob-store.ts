import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface BlobStore {
  put(key: string, bytes: Buffer): Promise<void>;
}

export const BLOB_STORE = Symbol('BLOB_STORE');

export class LocalBlobStore implements BlobStore {
  constructor(private readonly dir: string) {}

  async put(key: string, bytes: Buffer): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, key), bytes);
  }
}

export class NullBlobStore implements BlobStore {
  async put(): Promise<void> {}
}
