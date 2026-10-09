import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate';
import { PgClaimsRepository } from '../src/claims/pg-claims.repository';

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb('PgClaimsRepository (PostgreSQL)', () => {
  let pool: Pool;
  let repo: PgClaimsRepository;

  beforeAll(async () => {
    await migrate(url!);
    pool = new Pool({ connectionString: url });
    repo = new PgClaimsRepository(pool);
  });

  afterAll(() => pool.end());

  it('round-trips a claim and a photo, updating status atomically', async () => {
    const claim = await repo.createClaim({
      id: randomUUID(),
      reference: `INT-${randomUUID()}`,
      address: '1 Test Rd',
      status: 'open',
    });
    const classification = {
      damageType: 'storm' as const,
      severity: 'severe' as const,
      confidence: 0.8,
      notes: 'roof sheeting lifted',
      provider: 'test',
    };
    await repo.addPhoto(
      { id: randomUUID(), claimId: claim.id, filename: 'roof.jpg', mimeType: 'image/jpeg', sizeBytes: 10, sha256: 'abc', classification },
      'needs_review',
    );

    expect((await repo.findClaim(claim.id))?.status).toBe('needs_review');
    const [photo] = await repo.listPhotos(claim.id);
    expect(photo.classification).toEqual(classification);
    expect(await repo.findPhotoByHash(claim.id, 'abc')).not.toBeNull();
  });

  it('enforces one copy of an image per claim at the database level', async () => {
    const claim = await repo.createClaim({ id: randomUUID(), reference: `INT-${randomUUID()}`, address: 'x', status: 'open' });
    const photo = () => ({
      id: randomUUID(), claimId: claim.id, filename: 'a.jpg', mimeType: 'image/jpeg', sizeBytes: 1, sha256: 'dup',
      classification: { damageType: 'none' as const, severity: 'none' as const, confidence: 0.9, notes: '', provider: 't' },
    });
    await repo.addPhoto(photo(), 'triaged');
    await expect(repo.addPhoto(photo(), 'triaged')).rejects.toThrow();
    expect(await repo.listPhotos(claim.id)).toHaveLength(1);
  });
});
