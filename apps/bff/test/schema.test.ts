import { describe, expect, it } from 'vitest';
import { createYoga } from 'graphql-yoga';
import { ApiClient } from '../src/api-client.js';
import { schema } from '../src/schema.js';

const claim = { id: 'c1', reference: 'CLM-1', address: '1 Test St', status: 'needs_review', createdAt: '2026-10-07T00:00:00Z' };
const photo = (damageType: string, severity: string) => ({
  id: `p-${damageType}-${severity}`, claimId: 'c1', filename: 'a.jpg', mimeType: 'image/jpeg', sizeBytes: 10,
  classification: { damageType, severity, confidence: 0.8, notes: '', provider: 'mock' }, createdAt: '2026-10-07T00:00:00Z',
});

function fakeApi(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const path = url.replace('http://api', '');
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    const body = routes[`${init?.method ?? 'GET'} ${path}`];
    if (body === undefined) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { api: new ApiClient('http://api', fetchFn), calls };
}

async function run(api: ApiClient, query: string, variables?: object) {
  const yoga = createYoga({ schema, context: () => ({ api }) });
  const res = await yoga.fetch('http://bff/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

describe('GraphQL BFF', () => {
  it('returns a claim with photos and a damage summary from one REST call', async () => {
    const { api, calls } = fakeApi({
      'GET /claims/c1': { claim, photos: [photo('water', 'minor'), photo('water', 'severe'), photo('storm', 'moderate')] },
    });
    const res = await run(api, `{ claim(id: "c1") { status photos { classification { damageType severity } } summary { damageType count } } }`);
    expect(res.errors).toBeUndefined();
    expect(res.data.claim.status).toBe('NEEDS_REVIEW');
    expect(res.data.claim.photos).toHaveLength(3);
    expect(res.data.claim.summary).toEqual(
      expect.arrayContaining([{ damageType: 'WATER', count: 2 }, { damageType: 'STORM', count: 1 }]),
    );
    expect(calls).toEqual(['GET /claims/c1']);
  });

  it('returns null for an unknown claim', async () => {
    const { api } = fakeApi({});
    const res = await run(api, `{ claim(id: "missing") { id } }`);
    expect(res.data.claim).toBeNull();
  });

  it('does not fetch photos for a claim list unless asked', async () => {
    const { api, calls } = fakeApi({ 'GET /claims?limit=20': [claim] });
    const res = await run(api, `{ claims { reference status } }`);
    expect(res.data.claims).toEqual([{ reference: 'CLM-1', status: 'NEEDS_REVIEW' }]);
    expect(calls).toEqual(['GET /claims?limit=20']);
  });

  it('creates a claim through the REST API', async () => {
    const { api, calls } = fakeApi({ 'POST /claims': { ...claim, status: 'open' } });
    const res = await run(api, `mutation($i: CreateClaimInput!) { createClaim(input: $i) { id status photos { id } } }`, {
      i: { reference: 'CLM-1', address: '1 Test St' },
    });
    expect(res.data.createClaim).toEqual({ id: 'c1', status: 'OPEN', photos: [] });
    expect(calls).toEqual(['POST /claims']);
  });
});
