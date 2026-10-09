import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { InMemoryClaimsRepository } from '../src/claims/in-memory-claims.repository';
import { configureApp } from '../src/main';
import { NullBlobStore } from '../src/storage/blob-store';
import { Classification } from '../src/domain/classification';
import { VisionProvider } from '../src/vision/vision-provider';

class ScriptedVision implements VisionProvider {
  readonly name = 'scripted';
  next: Partial<Classification> = {};
  async classify(): Promise<Classification> {
    return { damageType: 'water', severity: 'minor', confidence: 0.9, notes: '', provider: this.name, ...this.next };
  }
}

describe('claims HTTP API', () => {
  let app: INestApplication;
  let vision: ScriptedVision;

  beforeEach(async () => {
    vision = new ScriptedVision();
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule.register({ repository: new InMemoryClaimsRepository(), vision, blobs: new NullBlobStore() }),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(() => app.close());

  const createClaim = () =>
    request(app.getHttpServer())
      .post('/claims')
      .send({ reference: 'CLM-1001', address: '12 Example St, Rockhampton QLD' })
      .expect(201);

  const upload = (id: string, content: string, type = 'image/jpeg') =>
    request(app.getHttpServer())
      .post(`/claims/${id}/photos`)
      .attach('photo', Buffer.from(content), { filename: 'p.jpg', contentType: type });

  it('creates a claim in the open state', async () => {
    const res = await createClaim();
    expect(res.body).toMatchObject({ reference: 'CLM-1001', status: 'open' });
  });

  it('rejects an invalid claim body', async () => {
    await request(app.getHttpServer()).post('/claims').send({ reference: '' }).expect(400);
  });

  it('classifies an uploaded photo and triages the claim', async () => {
    const { body: claim } = await createClaim();
    const res = await upload(claim.id, 'photo-1').expect(201);
    expect(res.body.photo.classification).toMatchObject({ damageType: 'water', provider: 'scripted' });
    expect(res.body.claim.status).toBe('triaged');
  });

  it('escalates the claim when a later photo is severe', async () => {
    const { body: claim } = await createClaim();
    await upload(claim.id, 'photo-1').expect(201);
    vision.next = { severity: 'severe' };
    await upload(claim.id, 'photo-2').expect(201);
    const { body } = await request(app.getHttpServer()).get(`/claims/${claim.id}`).expect(200);
    expect(body.claim.status).toBe('needs_review');
    expect(body.photos).toHaveLength(2);
  });

  it('rejects a duplicate photo on the same claim', async () => {
    const { body: claim } = await createClaim();
    await upload(claim.id, 'same-bytes').expect(201);
    await upload(claim.id, 'same-bytes').expect(409);
  });

  it('rejects non-image uploads', async () => {
    const { body: claim } = await createClaim();
    await upload(claim.id, 'hello', 'text/plain').expect(400);
  });

  it('returns 404 for an unknown claim', async () => {
    await request(app.getHttpServer()).get('/claims/7b0d2c3e-0000-4000-8000-000000000000').expect(404);
  });
});
