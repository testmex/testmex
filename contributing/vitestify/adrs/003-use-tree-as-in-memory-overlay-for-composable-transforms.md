# ADR 003: Use Tree as in-memory overlay for composable transforms

- **Status:** Accepted
- **Date:** 2026-07-12
- **Related design doc:** [001-vitestify](../design-docs/archived/001-vitestify.md)

## Context

- Multiple transforms edit the same file per run; writing to disk after each would clobber prior edits.

## Decision

- **`Tree`** stages all reads/writes in memory over the `FileSystem`; `commit()` flushes once at the end.
- Supports lazy cached reads, staged deletes, and renames via `rename()`.
- `changes()` returns staged create/update/delete records before anything hits disk.
- Transforms read/write through `Tree`; renames and deletes go through `Workspace` to keep file state in sync.

## Consequences

### Positive

- Transforms compose on the same file; testable with `FileSystemFake`; `Transformer` commits atomically after all transforms.
- Enables dry-run: inspect `changes()` and skip `commit()`.

### Negative / accepted risks

- All edits live in memory until commit; bypassing the `Tree` breaks composition; no rollback on commit failure (v1).
