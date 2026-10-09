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

## Known limitations (deliberate for v1)
- Status is re-derived per upload in the service. Two concurrent uploads to the same claim could race. A database-side recalculation or a row lock on the claim would close this.
- Image bytes are written before the database insert. A failed insert can leave an orphaned file, which a cleanup job would collect.
