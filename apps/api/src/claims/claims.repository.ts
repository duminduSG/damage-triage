import { Classification, ClaimStatus } from '../domain/classification';

export class ClaimNotFoundError extends Error {}
export class DuplicatePhotoError extends Error {}

export interface Claim {
  id: string;
  reference: string;
  address: string;
  status: ClaimStatus;
  createdAt: Date;
}

export interface Photo {
  id: string;
  claimId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  classification: Classification;
  createdAt: Date;
}

export type NewPhoto = Omit<Photo, 'createdAt'>;

export interface ClaimsRepository {
  createClaim(claim: Omit<Claim, 'createdAt'>): Promise<Claim>;
  findClaim(id: string): Promise<Claim | null>;
  listClaims(limit: number): Promise<Claim[]>;
  listPhotos(claimId: string): Promise<Photo[]>;
  findPhotoByHash(claimId: string, sha256: string): Promise<Photo | null>;
  // Inserts the photo, then works out the status from *all* the claim's photos while the
  // claim is locked, so concurrent uploads can't overwrite each other's result.
  addPhotoAndRetriage(
    photo: NewPhoto,
    decide: (all: Classification[]) => ClaimStatus,
  ): Promise<{ photo: Photo; claim: Claim }>;
}

export const CLAIMS_REPOSITORY = Symbol('CLAIMS_REPOSITORY');
