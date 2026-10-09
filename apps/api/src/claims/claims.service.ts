import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { TriagePolicy, triageStatus } from '../domain/classification';
import { BLOB_STORE, BlobStore } from '../storage/blob-store';
import { TRIAGE_POLICY } from '../domain/triage-policy.token';
import { VISION_PROVIDER, VisionProvider } from '../vision/vision-provider';
import {
  CLAIMS_REPOSITORY,
  Claim,
  ClaimNotFoundError,
  ClaimsRepository,
  DuplicatePhotoError,
  Photo,
} from './claims.repository';

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ClaimsService {
  constructor(
    @Inject(CLAIMS_REPOSITORY) private readonly repo: ClaimsRepository,
    @Inject(VISION_PROVIDER) private readonly vision: VisionProvider,
    @Inject(BLOB_STORE) private readonly blobs: BlobStore,
    @Inject(TRIAGE_POLICY) private readonly policy: TriagePolicy,
  ) {}

  createClaim(reference: string, address: string): Promise<Claim> {
    return this.repo.createClaim({ id: randomUUID(), reference, address, status: 'open' });
  }

  listClaims(limit = 50): Promise<Claim[]> {
    return this.repo.listClaims(limit);
  }

  async getClaim(id: string): Promise<{ claim: Claim; photos: Photo[] }> {
    const claim = await this.repo.findClaim(id);
    if (!claim) throw new NotFoundException(`Claim ${id} not found`);
    return { claim, photos: await this.repo.listPhotos(id) };
  }

  async addPhoto(claimId: string, file: UploadedImage): Promise<{ photo: Photo; claim: Claim }> {
    if (!(await this.repo.findClaim(claimId))) {
      throw new NotFoundException(`Claim ${claimId} not found`);
    }

    // Same photo twice shouldn't count as extra evidence. Checking early saves a model
    // call; the unique constraint still catches two identical uploads racing each other.
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    if (await this.repo.findPhotoByHash(claimId, sha256)) {
      throw new ConflictException('This photo is already attached to the claim');
    }

    // The model call is the slow part, so it happens before we take the claim lock.
    const classification = await this.vision.classify({
      bytes: file.buffer,
      mimeType: file.mimetype,
      sha256,
    });

    const id = randomUUID();
    // TODO: orphaned file if the insert below fails (ADR 0003)
    await this.blobs.put(id, file.buffer);
    try {
      return await this.repo.addPhotoAndRetriage(
        {
          id,
          claimId,
          filename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          sha256,
          classification,
        },
        (all) => triageStatus(all, this.policy),
      );
    } catch (err) {
      if (err instanceof DuplicatePhotoError) {
        throw new ConflictException('This photo is already attached to the claim');
      }
      if (err instanceof ClaimNotFoundError) throw new NotFoundException(`Claim ${claimId} not found`);
      throw err;
    }
  }
}
