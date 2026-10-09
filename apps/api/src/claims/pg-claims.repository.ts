import { Pool } from 'pg';
import { ClaimStatus } from '../domain/classification';
import { Claim, ClaimsRepository, NewPhoto, Photo } from './claims.repository';

const toClaim = (r: any): Claim => ({
  id: r.id,
  reference: r.reference,
  address: r.address,
  status: r.status,
  createdAt: r.created_at,
});

const toPhoto = (r: any): Photo => ({
  id: r.id,
  claimId: r.claim_id,
  filename: r.filename,
  mimeType: r.mime_type,
  sizeBytes: r.size_bytes,
  sha256: r.sha256,
  classification: r.classification,
  createdAt: r.created_at,
});

export class PgClaimsRepository implements ClaimsRepository {
  constructor(private readonly pool: Pool) {}

  async createClaim(claim: Omit<Claim, 'createdAt'>): Promise<Claim> {
    const { rows } = await this.pool.query(
      `INSERT INTO claims (id, reference, address, status) VALUES ($1, $2, $3, $4) RETURNING *`,
      [claim.id, claim.reference, claim.address, claim.status],
    );
    return toClaim(rows[0]);
  }

  async findClaim(id: string): Promise<Claim | null> {
    const { rows } = await this.pool.query(`SELECT * FROM claims WHERE id = $1`, [id]);
    return rows[0] ? toClaim(rows[0]) : null;
  }

  async listClaims(limit: number): Promise<Claim[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM claims ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(toClaim);
  }

  async listPhotos(claimId: string): Promise<Photo[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM photos WHERE claim_id = $1 ORDER BY created_at`,
      [claimId],
    );
    return rows.map(toPhoto);
  }

  async findPhotoByHash(claimId: string, sha256: string): Promise<Photo | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM photos WHERE claim_id = $1 AND sha256 = $2`,
      [claimId, sha256],
    );
    return rows[0] ? toPhoto(rows[0]) : null;
  }

  async addPhoto(photo: NewPhoto, newStatus: ClaimStatus): Promise<Photo> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO photos (id, claim_id, filename, mime_type, size_bytes, sha256, classification)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          photo.id,
          photo.claimId,
          photo.filename,
          photo.mimeType,
          photo.sizeBytes,
          photo.sha256,
          JSON.stringify(photo.classification),
        ],
      );
      await client.query(`UPDATE claims SET status = $1 WHERE id = $2`, [newStatus, photo.claimId]);
      await client.query('COMMIT');
      return toPhoto(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
