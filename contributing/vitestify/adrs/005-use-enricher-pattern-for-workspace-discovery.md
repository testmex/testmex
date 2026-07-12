# ADR 005: Use enricher pattern for workspace discovery

- **Status:** Accepted
- **Date:** 2026-07-12
- **Related design doc:** [001-vitestify](../design-docs/archived/001-vitestify.md)

## Context

- Angular CLI and Nx need different discovery (graph queries vs `angular.json`); a monolithic scanner won't scale to more frameworks.

## Decision

- **Scanner** runs **Enrichers** sequentially; each returns a `WorkspaceEnrichment` merged into workspace state (projects, file tags).
- Enrichers no-op when not applicable (e.g. no `angular.json`, no Nx) — no central `workspaceType`.
- Enricher factories registered via packs (see ADR 004).

## Consequences

### Positive

- Framework logic isolated per enricher; file tags give heuristics/transforms a stable vocabulary.

### Negative / accepted risks

- No shared scan pass in v1; enricher ordering matters when later enrichers depend on tags from earlier ones.
