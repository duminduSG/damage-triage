# 0002: Vision models sit behind a provider interface

**Status:** accepted

## Context
Classification will come from an external vision model. Models change, prices change, and a team may want to compare two side by side. Tests and local development must not need an API key or network access.

## Decision
- `VisionProvider` is the only contract the app depends on: `classify(image) -> Classification`.
- `MockVisionProvider` derives a deterministic result from the image's SHA-256, so the same photo always classifies the same way.
- The provider is chosen in one place (`visionFromEnv`) from `VISION_PROVIDER`.
- Every stored classification records which `provider` produced it.

## Consequences
- Adding a real model is one class plus one `case` in `visionFromEnv`, with no changes to the service, storage or UI.
- Recording the provider keeps historical results auditable after a switch.
- The mock is not a model. It exists to exercise every code path (including low-confidence and severe results) reproducibly.
