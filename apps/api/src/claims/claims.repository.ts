import { Classification, ClaimStatus } from '../domain/classification';

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
  // inserts the photo and updates claim status in one transaction
  addPhoto(photo: NewPhoto, newStatus: ClaimStatus): Promise<Photo>;
}

export const CLAIMS_REPOSITORY = Symbol('CLAIMS_REPOSITORY');
