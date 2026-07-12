# ADR 001: Use standalone CLI instead of Nx generator

- **Status:** Accepted
- **Date:** 2026-07-12
- **Related design doc:** [001-vitestify](../design-docs/archived/001-vitestify.md)

## Context

- Vitestify migrates workspaces from Jest to Vitest — Angular CLI, Nx, and other stacks (e.g. Vite + React).
- Nx generators tie us to `@nx/devkit` and specific Nx versions; Angular CLI and plain Vite projects don't use them at all.

## Decision

- Ship as a **standalone CLI** (`npx @testmex/vitestify`), not an Nx generator.
- No `@nx/devkit` dependency for orchestration or file mutation.

## Consequences

### Positive

- Works across Angular CLI, Nx, and framework-agnostic setups (e.g. Vite + React) without version-locked dependencies; full control over scan → transform → finalize.

### Negative / accepted risks

- No `nx g` discovery; we reimplement workspace introspection Nx generators get for free.
