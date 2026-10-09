import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate';
import { DuplicatePhotoError, NewPhoto } from '../src/claims/claims.repository';
import { PgClaimsRepository } from '../src/claims/pg-claims.repository';
import { Classification, triageStatus } from '../src/domain/classification';

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;

const classification = (over: Partial<Classification> = {}): Classification => ({
  damageType: 'water',
  severity: 'minor',
  confidence: 0.9,
  notes: '',
  provider: 'test',
  ...over,
});

describeDb('PgClaimsRepository (PostgreSQL)', () => {
  let pool: Pool;
  let repo: PgClaimsRepository;

  beforeAll(async () => {
    await migrate(url!);
    pool = new Pool({ connectionString: url, max: 10 });
    repo = new PgClaimsRepository(pool);
  });

  afterAll(() => pool.end());

  const newClaim = () =>
    repo.createClaim({ id: randomUUID(), reference: `INT-${randomUUID()}`, address: '1 Test Rd', status: 'open' });

  const photo = (claimId: string, sha256: string, c: Classification): NewPhoto => ({
    id: randomUUID(),
    claimId,
    filename: `${sha256}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 10,
    sha256,
    classification: c,
  });

  it('stores the photo and returns the re-derived claim status', async () => {
    const claim = await newClaim();
    const severe = classification({ damageType: 'storm', severity: 'severe', notes: 'roof sheeting lifted' });

    const result = await repo.addPhotoAndRetriage(photo(claim.id, 'roof', severe), (all) => triageStatus(all));

    expect(result.claim.status).toBe('needs_review');
    expect((await repo.findClaim(claim.id))?.status).toBe('needs_review');
    const [stored] = await repo.listPhotos(claim.id);
    expect(stored.classification).toEqual(severe);
  });

  it('never loses a severe photo to a concurrent upload', async () => {
    // Repeat a few times: a race that only shows up sometimes is still a race.
    for (let i = 0; i < 10; i++) {
      const claim = await newClaim();
      await Promise.all([
        repo.addPhotoAndRetriage(photo(claim.id, 'roof', classification({ severity: 'severe' })), (all) => triageStatus(all)),
        repo.addPhotoAndRetriage(photo(claim.id, 'carpet', classification()), (all) => triageStatus(all)),
        repo.addPhotoAndRetriage(photo(claim.id, 'wall', classification()), (all) => triageStatus(all)),
      ]);
      expect((await repo.findClaim(claim.id))?.status).toBe('needs_review');
      expect(await repo.listPhotos(claim.id)).toHaveLength(3);
    }
  });

  it('reports two identical uploads racing each other as a duplicate, not a crash', async () => {
    const claim = await newClaim();
    const results = await Promise.allSettled([
      repo.addPhotoAndRetriage(photo(claim.id, 'same', classification()), (all) => triageStatus(all)),
      repo.addPhotoAndRetriage(photo(claim.id, 'same', classification()), (all) => triageStatus(all)),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(DuplicatePhotoError);
    expect(await repo.listPhotos(claim.id)).toHaveLength(1);
  });
});
