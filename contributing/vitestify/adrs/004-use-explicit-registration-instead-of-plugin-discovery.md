# ADR 004: Use explicit registration instead of plugin discovery

- **Status:** Accepted
- **Date:** 2026-07-12
- **Related design doc:** [001-vitestify](../design-docs/archived/001-vitestify.md)

## Context

- Many enrichers, heuristics, and transforms grouped by concern (Jest, Nx, Angular CLI); v1 has no third-party extensions.

## Decision

- **Explicit registration** — no auto-discovery or runtime plugins.
- Group into **packs** (`jest`, `core`, `angular-cli`, `nx`), each exporting enricher factories, heuristics, and transforms; composed at startup. Pack order is significant.

## Consequences

### Positive

- Registration is visible and testable; framework-specific rules stay isolated in packs.

### Negative / accepted risks

- Every new rule needs a code change and release; pack ordering must be maintained manually.
