export type ClaimStatus = 'OPEN' | 'TRIAGED' | 'NEEDS_REVIEW';

export interface Classification {
  damageType: string;
  severity: string;
  confidence: number;
  notes: string;
  provider: string;
}

export interface Photo {
  id: string;
  filename: string;
  classification: Classification;
}

export interface Claim {
  id: string;
  reference: string;
  address: string;
  status: ClaimStatus;
  photos?: Photo[];
  summary?: { damageType: string; count: number }[];
}

async function gql<T>(query: string, variables?: object): Promise<T> {
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data as T;
}

export const listClaims = () =>
  gql<{ claims: Claim[] }>(`{ claims { id reference address status } }`).then((d) => d.claims);

export const getClaim = (id: string) =>
  gql<{ claim: Claim | null }>(
    `query($id: ID!) { claim(id: $id) { id reference address status
       summary { damageType count }
       photos { id filename classification { damageType severity confidence notes provider } } } }`,
    { id },
  ).then((d) => d.claim);

export const createClaim = (reference: string, address: string) =>
  gql<{ createClaim: Claim }>(
    `mutation($i: CreateClaimInput!) { createClaim(input: $i) { id reference address status } }`,
    { i: { reference, address } },
  ).then((d) => d.createClaim);

export async function uploadPhoto(claimId: string, file: File) {
  const form = new FormData();
  form.append('photo', file);
  const res = await fetch(`/api/claims/${claimId}/photos`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Upload failed (${res.status})`);
  }
}
