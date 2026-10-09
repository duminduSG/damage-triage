import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { TriagePolicy, triageStatus } from '../domain/classification';
import { BLOB_STORE, BlobStore } from '../storage/blob-store';
import { TRIAGE_POLICY } from '../domain/triage-policy.token';
import { VISION_PROVIDER, VisionProvider } from '../vision/vision-provider';
import { CLAIMS_REPOSITORY, Claim, ClaimsRepository, Photo } from './claims.repository';

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
    const claim = await this.repo.findClaim(claimId);
    if (!claim) throw new NotFoundException(`Claim ${claimId} not found`);

    // same photo twice shouldn't count as extra evidence
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    if (await this.repo.findPhotoByHash(claimId, sha256)) {
      throw new ConflictException('This photo is already attached to the claim');
    }

    const classification = await this.vision.classify({
      bytes: file.buffer,
      mimeType: file.mimetype,
      sha256,
    });

    const existing = await this.repo.listPhotos(claimId);
    const status = triageStatus(
      [...existing.map((p) => p.classification), classification],
      this.policy,
    );

    const id = randomUUID();
    // TODO: orphaned file if the insert below fails (ADR 0003)
    await this.blobs.put(id, file.buffer);
    const photo = await this.repo.addPhoto(
      {
        id,
        claimId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        sha256,
        classification,
      },
      status,
    );
    return { photo, claim: { ...claim, status } };
  }
}
