# ADR 002: Use detect-act pipeline for migration orchestration

- **Status:** Accepted
- **Date:** 2026-07-12
- **Related design doc:** [001-vitestify](../design-docs/archived/001-vitestify.md)

## Context

- Jest-to-Vitest touches configs, test files, `package.json`, and runner targets across projects — too much for a one-shot codemod.
- Detection rules and rewrite logic evolve independently.

## Decision

- **detect → act** pipeline: **Scanner** → **Analyzer** → **Transformer** → **Finalizer**.
- **Scanner** runs enrichers and builds a `Workspace` with a shared `Tree`.
- **Analyzer** runs heuristics; findings are stored on workspace file state.
- **Transformer** runs transforms that read the workspace (file tags + findings) and write via `Tree`; calls `tree.commit()` once at the end.
- **Finalizer** runs shell commands queued on the workspace (e.g. dependency installs).

## Consequences

### Positive

- Heuristics and transforms are decoupled; transforms match files by tags and/or findings; easy to extend with new packs.

### Negative / accepted risks

- More wiring than a single codemod; transform ordering matters when multiple rules touch the same file (see ADR 003).
