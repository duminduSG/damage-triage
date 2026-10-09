# 0001: REST API for the domain, GraphQL BFF for the UI

**Status:** accepted

## Context
The domain is small and resource-shaped (claims, photos). The UI wants composed views: a claim with its photos and a per-damage-type summary in a single round trip.

## Decision
- The NestJS service owns the domain and the database, and exposes plain REST.
- A separate GraphQL backend-for-frontend (BFF) shapes REST responses into what the UI needs. It holds no state and never touches the database.
- Photo uploads go straight to the REST API. Multipart through GraphQL adds complexity and a second hop for large payloads, for no benefit.

## Consequences
- The domain API stays simple to test and reusable by non-UI clients (batch imports, partner integrations).
- The BFF adds a hop and a deployable. In return, UI-driven changes (new summaries, new fields) don't touch the domain service.
- The BFF only fetches photos when a query asks for them. A test asserts that a claim list makes exactly one REST call.
