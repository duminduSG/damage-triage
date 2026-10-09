import { Classification, ClaimStatus } from '../domain/classification';
import {
  Claim,
  ClaimNotFoundError,
  ClaimsRepository,
  DuplicatePhotoError,
  NewPhoto,
  Photo,
} from './claims.repository';

export class InMemoryClaimsRepository implements ClaimsRepository {
  private claims = new Map<string, Claim>();
  private photos: Photo[] = [];

  async createClaim(claim: Omit<Claim, 'createdAt'>): Promise<Claim> {
    if ([...this.claims.values()].some((c) => c.reference === claim.reference)) {
      throw new Error(`duplicate reference ${claim.reference}`);
    }
    const saved = { ...claim, createdAt: new Date() };
    this.claims.set(saved.id, saved);
    return saved;
  }

  async findClaim(id: string): Promise<Claim | null> {
    return this.claims.get(id) ?? null;
  }

  async listClaims(limit: number): Promise<Claim[]> {
    return [...this.claims.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async listPhotos(claimId: string): Promise<Photo[]> {
    return this.photos.filter((p) => p.claimId === claimId);
  }

  async findPhotoByHash(claimId: string, sha256: string): Promise<Photo | null> {
    return this.photos.find((p) => p.claimId === claimId && p.sha256 === sha256) ?? null;
  }

  // No awaits between reading and writing, so this runs atomically on the event loop.
  async addPhotoAndRetriage(photo: NewPhoto, decide: (all: Classification[]) => ClaimStatus) {
    const claim = this.claims.get(photo.claimId);
    if (!claim) throw new ClaimNotFoundError(photo.claimId);
    if (this.photos.some((p) => p.claimId === photo.claimId && p.sha256 === photo.sha256)) {
      throw new DuplicatePhotoError(photo.sha256);
    }

    const saved = { ...photo, createdAt: new Date() };
    this.photos.push(saved);
    const all = this.photos.filter((p) => p.claimId === claim.id).map((p) => p.classification);
    const updated = { ...claim, status: decide(all) };
    this.claims.set(claim.id, updated);
    return { photo: saved, claim: updated };
  }
}
