# ADR 006: Use @ast-grep/napi for test file rewrites

- **Status:** Accepted
- **Date:** 2026-07-12
- **Related design doc:** [001-vitestify](../design-docs/archived/001-vitestify.md)

## Context

- Test files are full of Jest APIs to rewrite; regex is brittle, full TS compiler API is heavy.

## Decision

- **@ast-grep/napi** (via `SgEditor`) for test file and JS/TS config AST rewrites.
- JSON/JSONC configs: read with `maybeReadJsonFile`, mutate, write back as formatted JSON. Karma/Jasmine out of scope.

## Consequences

### Positive

- Reliable syntactic transforms (`jest.mock` → `vi.mock`); fast native execution; declarative, testable rules.

### Negative / accepted risks

- Native dependency with platform binaries; exotic Jest patterns may need manual follow-up.
