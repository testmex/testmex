# Goals

- Developers running vitestify on their own repo should be able to migrate most tests to Vitest without the whole run failing because one file cannot be converted.
- When a test file cannot survive migration, it should stay runnable under Jest — vitestify migrates what it can and keeps the rest on Jest.
- Per-transform (or transform group) verification gives confidence that changes actually work (e.g. Vitest config loads, converted tests pass) before treating a step as successful.
- When verification fails, a transform-defined rollback should undo only the broken changes — not the entire migration.

# Non-Goals

- Requiring verification on every transform — only transforms that opt in define a verify step.
- Global or workspace-wide rollback — each transform rolls back only its own changes on verification failure.
- Git-based undo (reset, revert, stash) — rollback stays within vitestify's in-memory `Tree` / transform logic.
- Auto-retry or self-healing — a failed verification does not re-run or patch the transform automatically.
- Interactive prompts — no mid-run user input to choose what to rollback.
- Dry-run verification — verification runs after apply, not as a separate preview-without-changes mode.
- Report-only mode — verification failure always triggers rollback when the transform defines one; no verify-without-rollback path.

# Desired Behavior

<!-- Section 3 — to be filled -->

# Design

<!-- Section 4 — to be filled -->

## Diagram

<!-- Section 4a — to be filled -->

## Implementation Details

<!-- Section 4b — to be filled -->

# Testing Strategy

<!-- Section 5 — to be filled -->

# PR Plan

<!-- Section 6 — to be filled -->

# Alternatives Considered

<!-- Section 8 — to be filled -->

# Kitchen Sink

<!-- Section 9 — to be filled -->
