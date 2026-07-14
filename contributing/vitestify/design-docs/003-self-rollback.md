# Goals

- Developers running vitestify on their own repo should be able to migrate most tests to Vitest without the whole run failing because one file cannot be converted.
- When a test file cannot survive migration, it should stay runnable under Jest — vitestify migrates what it can and keeps the rest on Jest.
- Per-transform (or transform group) verification gives confidence that changes actually work (e.g. Vitest config loads, converted tests pass) before treating a step as successful.
- When verification fails, a transform-defined rollback should undo only the broken changes — not the entire migration.

# Non-Goals

<!-- Section 2 — to be filled -->

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
