import { createSchema } from 'graphql-yoga';
import { GraphQLError } from 'graphql';
import { ApiClient, ApiError, ApiPhoto } from './api-client.js';

export interface Context {
  api: ApiClient;
}

const typeDefs = /* GraphQL */ `
  enum ClaimStatus { OPEN TRIAGED NEEDS_REVIEW }
  enum DamageType { WATER FIRE STORM IMPACT MOULD NONE }
  enum Severity { NONE MINOR MODERATE SEVERE }

  type Classification {
    damageType: DamageType!
    severity: Severity!
    confidence: Float!
    notes: String!
    provider: String!
  }

  type Photo {
    id: ID!
    filename: String!
    sizeBytes: Int!
    createdAt: String!
    classification: Classification!
  }

  type DamageSummary {
    damageType: DamageType!
    count: Int!
  }

  type Claim {
    id: ID!
    reference: String!
    address: String!
    status: ClaimStatus!
    createdAt: String!
    photos: [Photo!]!
    summary: [DamageSummary!]!
  }

  type Query {
    claims(limit: Int = 20): [Claim!]!
    claim(id: ID!): Claim
  }

  input CreateClaimInput {
    reference: String!
    address: String!
  }

  type Mutation {
    createClaim(input: CreateClaimInput!): Claim!
  }
`;

const upper = (s: string) => s.toUpperCase();

function toClaim(claim: { id: string; reference: string; address: string; status: string; createdAt: string }, photos?: ApiPhoto[]) {
  return { ...claim, status: upper(claim.status), _photos: photos };
}

function toPhoto(p: ApiPhoto) {
  return {
    ...p,
    classification: {
      ...p.classification,
      damageType: upper(p.classification.damageType),
      severity: upper(p.classification.severity),
    },
  };
}

function wrap(e: unknown): never {
  if (e instanceof ApiError && e.status < 500) {
    throw new GraphQLError(e.message, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  throw e;
}

type ClaimParent = ReturnType<typeof toClaim>;

export const schema = createSchema<Context>({
  typeDefs,
  resolvers: {
    Query: {
      claims: (_: unknown, { limit }: { limit: number }, { api }: Context) =>
        api.listClaims(Math.min(Math.max(limit, 1), 100)).then((cs) => cs.map((c) => toClaim(c)), wrap),
      claim: async (_: unknown, { id }: { id: string }, { api }: Context) => {
        const res = await api.getClaim(id);
        return res ? toClaim(res.claim, res.photos) : null;
      },
    },
    Mutation: {
      createClaim: (_: unknown, { input }: { input: { reference: string; address: string } }, { api }: Context) =>
        api.createClaim(input.reference, input.address).then((c) => toClaim(c, []), wrap),
    },
    Claim: {
      // claim lists don't include photos, so only fetch them if the query asks
      photos: async (claim: ClaimParent, _: unknown, { api }: Context) => {
        const photos = claim._photos ?? (await api.getClaim(claim.id))?.photos ?? [];
        return photos.map(toPhoto);
      },
      summary: async (claim: ClaimParent, _: unknown, { api }: Context) => {
        const photos = claim._photos ?? (await api.getClaim(claim.id))?.photos ?? [];
        const counts = new Map<string, number>();
        for (const p of photos) {
          const t = upper(p.classification.damageType);
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        return [...counts].map(([damageType, count]) => ({ damageType, count }));
      },
    },
  },
});
