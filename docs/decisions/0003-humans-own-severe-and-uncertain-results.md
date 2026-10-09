# 0003: A human reviews anything severe or uncertain

**Status:** accepted

## Context
An automated classifier will be wrong some of the time. In insurance, a wrong "minor" on a severe loss is far more costly than an extra human look.

## Decision
- `triageStatus` is a pure function over a claim's classifications.
- A claim moves to `needs_review` if any photo is `severe` or below 0.6 confidence; otherwise it is `triaged`.
- The model never closes or approves a claim on its own.

## Consequences
- The rule is tested in isolation, including the threshold boundary.
- The threshold is a single constant, easy to tune once real-model accuracy is measured.

## Known limitations (deliberate for v1)
- Status is re-derived per upload in the service. Two concurrent uploads to the same claim could race. A database-side recalculation or a row lock on the claim would close this.
- Image bytes are written before the database insert. A failed insert can leave an orphaned file, which a cleanup job would collect.
