# 0003: A human reviews anything severe or uncertain

**Status:** accepted

## Context
An automated classifier will be wrong some of the time. In insurance, a wrong "minor" on a severe loss is far more costly than an extra human look.

## Decision
`triageStatus` is a pure function over a claim's classifications and a `TriagePolicy`. A claim goes to `needs_review` when:

- **any photo is `severe`**
- **any damage photo is below the confidence threshold** (default 0.6, set with `REVIEW_CONFIDENCE_THRESHOLD`)
- **any photo shows a damage type that always needs a person.** Currently only `fire`: smoke, heat and electrical damage rarely show fully in a photo, and fire claims are high-value.
- **no photo shows any damage at all.** Someone claimed damage and the model can't see it, which means bad photos, hidden damage, or a claim worth a closer look.

Otherwise the claim is `triaged`. The model never closes or approves a claim on its own.

Photos classified as `none` don't count toward the confidence check. Claims often include context shots (front of house, meter box), and uncertainty about whether those show damage tells us nothing about the claim.

## Consequences
- Each rule has its own test, including the threshold boundary.
- The threshold is validated at startup: anything outside 0 to 1 stops the app rather than silently misbehaving.
- Adding another always-review type (e.g. `mould`, a health risk) is a one-word change to the policy.

## Concurrency
Status used to be worked out from a snapshot of the claim's photos taken *before* saving. Two uploads to the same claim at the same moment could each miss the other's photo, and the last write won: a severe photo could end up on a claim marked `triaged` (a lost update).

Now the repository inserts the photo and re-derives the status from **all** of the claim's photos inside one transaction that holds a row lock on the claim (`SELECT ... FOR UPDATE`). A second upload to the same claim waits for the first to commit. Uploads to different claims don't block each other.

The vision model call happens **before** the transaction, so the lock is held for a few milliseconds of SQL rather than for a slow network call.

Two identical photos racing each other both pass the early duplicate check. The database's unique constraint stops the second one, and the repository reports it as a duplicate (409), not a server error.

Tests reproduce both races: an HTTP test with deliberately slow storage, and a PostgreSQL test that fires concurrent uploads. The PostgreSQL test fails if the `FOR UPDATE` is removed.

## Known limitations
- Image bytes are written before the database insert. A failed insert can leave an orphaned file, which a cleanup job would collect.
