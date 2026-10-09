import { ClaimStatus } from '../domain/classification';
import { Claim, ClaimsRepository, NewPhoto, Photo } from './claims.repository';

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

  async addPhoto(photo: NewPhoto, newStatus: ClaimStatus): Promise<Photo> {
    const saved = { ...photo, createdAt: new Date() };
    this.photos.push(saved);
    const claim = this.claims.get(photo.claimId)!;
    this.claims.set(claim.id, { ...claim, status: newStatus });
    return saved;
  }
}
