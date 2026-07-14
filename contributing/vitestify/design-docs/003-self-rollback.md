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

## Per-transform pipeline (default)

- [ ] Transform without verification: `apply()` stages changes in `Tree`; no commit, no commands, no verify yet.
- [ ] Pipeline continues to the next transform with staged changes still in memory.

## Verifying transform (opt-in)

When a transform defines verification, `Transformer` runs a full checkpoint cycle before moving on:

- [ ] `Transformer` calls `CommandFlusher` directly to run queued workspace commands (e.g. `pnpm install`) so verification can use real on-disk state.
- [ ] Transform-specific `verify()` runs (e.g. jest-test transform runs converted tests).
- [ ] On verify success: pipeline continues to the next transform.
- [ ] On verify failure: transform-defined `rollback()` undoes only that transform's broken changes, then pipeline continues.

## End of run

- [ ] After the last transform, any remaining staged changes are committed once (if not already flushed by a verifying transform).

## Examples

### jest-test transform group

- [ ] After commit + `CommandFlusher`, verify runs Vitest against converted spec files.
- [ ] On failure for individual files, rollback reverts only those files and renames them to `.jest.*` so Jest can still run them.
- [ ] Passing files stay migrated; migration continues with a mix of Vitest and Jest tests.

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

# Future Work

## vitest-config transform verification

- After commit + `CommandFlusher`, verify runs Vitest in a lightweight mode (config loads, no test execution).
- On failure, rollback reverts vitest config / setup file changes staged by that transform.

# Kitchen Sink

<!-- Section 9 — to be filled -->
