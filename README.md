# Damage Triage

[![CI](https://github.com/duminduSG/damage-triage/actions/workflows/ci.yml/badge.svg)](https://github.com/duminduSG/damage-triage/actions/workflows/ci.yml)

Upload photos of property damage to a claim, have each photo classified (damage type, severity, confidence), and let the claim triage itself. Confident, non-severe claims are marked **triaged**. Anything severe, uncertain, fire-related, or showing no visible damage at all goes to a person as **needs review** ([rules](docs/decisions/0003-humans-own-severe-and-uncertain-results.md)).

It's a small, complete slice of an AI-assisted claims workflow, built to show how I structure a full-stack TypeScript service: clear boundaries, plain SQL, tests at every layer, and decisions written down.

> **Status:** v1 uses a deterministic mock vision provider, so it runs and tests without an API key. A real vision model plugs in behind the same interface (see [ADR 0002](docs/decisions/0002-vision-provider-boundary.md)).

## Architecture

```
 Next.js UI    ──GraphQL──▶  BFF (graphql-yoga)  ──REST──▶  API (NestJS)  ──SQL──▶  PostgreSQL
      │                                                         │
      └──────────── multipart photo upload (REST) ─────────────▶│──▶ VisionProvider (mock | real model)
```

| Part | What it does |
|---|---|
| `apps/api` | NestJS REST API. Owns the domain and PostgreSQL. Validates uploads, de-duplicates by SHA-256, classifies, re-derives claim status in one transaction. |
| `apps/bff` | GraphQL backend-for-frontend. Stateless; composes REST calls into the views the UI needs, and only fetches photos when a query asks for them. |
| `apps/web` | Next.js (App Router) + shadcn/ui: create a claim, drop in photos, see per-photo results and a damage summary. |

### Design decisions
- [0001: REST API for the domain, GraphQL BFF for the UI](docs/decisions/0001-rest-api-plus-graphql-bff.md)
- [0002: Vision models sit behind a provider interface](docs/decisions/0002-vision-provider-boundary.md)
- [0003: A human reviews anything severe or uncertain](docs/decisions/0003-humans-own-severe-and-uncertain-results.md) (including known v1 limitations)

## Run it locally

Requires Node 20+ and Docker.

```bash
npm install
npm run db:up                                   # PostgreSQL 16 in Docker
cp .env.example .env && export $(grep -v '^#' .env | xargs)
npm run db:migrate

npm run dev -w apps/api                         # http://localhost:3001
npm run dev -w apps/bff                         # http://localhost:4000/graphql
npm run dev -w apps/web                         # http://localhost:5173
```

## Tests

```bash
npm test                                        # unit, HTTP and UI tests (no database needed)
DATABASE_URL=postgres://triage:triage@localhost:5432/triage npm run test:int -w apps/api
```

- **Domain:** triage rules, including the confidence threshold boundary.
- **HTTP:** the NestJS app end to end against an in-memory repository and a scripted vision provider (status transitions, duplicate rejection, validation, 404s).
- **PostgreSQL:** the real repository against a real database, including the transactional status update and the per-claim uniqueness constraint.
- **BFF:** GraphQL queries against a fake REST API, asserting both results and the exact REST calls made.

CI runs all of it on every push, with PostgreSQL as a service container.

## API

| Method | Path | |
|---|---|---|
| `POST` | `/claims` | `{ reference, address }` |
| `GET` | `/claims?limit=50` | newest first |
| `GET` | `/claims/:id` | claim plus photos |
| `POST` | `/claims/:id/photos` | multipart field `photo` (JPEG, PNG or WebP, max 10 MB) |

## Roadmap
- Real vision provider behind `VisionProvider`, with an evaluation set to tune the review threshold
- Database-side status recalculation to remove the concurrent-upload race noted in ADR 0003
- Object storage (S3) behind `BlobStore`, and Terraform for the hosted setup

## How this was built
I wrote this with Claude Code as a coding assistant. The architecture, boundaries and trade-offs are mine, and I can walk through any line of it.

## License
MIT
