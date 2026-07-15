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

When `apply()` returns a `TransformResult` with `verify`, `Transformer` runs a full checkpoint cycle before moving on:

- [ ] `Transformer` calls `CommandFlusher` directly to run queued workspace commands (e.g. `pnpm install`) so verification can use real on-disk state.
- [ ] `apply()` always returns `TransformResult` via `createTransformResult()`; transforms without verification omit `verify`.
- [ ] `TransformResult.verify()` runs (e.g. jest-test transform runs converted tests).
- [ ] On verify success: pipeline continues to the next transform.
- [ ] On verify failure: `VerifyResult.rollback()` undoes only that transform's broken changes when defined, then pipeline continues.

## End of run

- [ ] After the last transform, any remaining staged changes are committed once (if not already flushed by a verifying transform).

## Examples

### jest-test transform group

- [ ] After commit + `CommandFlusher`, verify runs Vitest against converted spec files.
- [ ] On failure for individual files, rollback reverts only those files and renames them to `.jest.*` so Jest can still run them.
- [ ] Passing files stay migrated; migration continues with a mix of Vitest and Jest tests.

# Design

`apply()` always returns a `TransformResult`.
Transforms that opt into verification provide `verify` on the result; `verify()` always returns a `VerifyResult`.
`VerifyResult.rollback()` undoes broken changes when defined.
`Transformer` orchestrates the checkpoint cycle when `TransformResult.verify` is defined.
Rename `Finalizer` → `CommandFlusher`; `Transformer` calls it directly after `Tree.commit()`.

```typescript
interface Transform {
  apply(
    workspace: WritableWorkspace,
    options?: { onProgress?(detail: string): void },
  ): Promise<TransformResult>;
}

interface TransformResult {
  verify?(): Promise<VerifyResult>;
}

interface VerifyResult {
  rollback?(): Promise<void>;
}

function createTransformResult(options?: {
  verify?(): Promise<VerifyResult>;
}): TransformResult;

function createVerifyResult(options?: {
  rollback?(): Promise<void>;
}): VerifyResult;
```

- `apply()` returns `createTransformResult()` — no verification; staged changes stay in `Tree`; no checkpoint.
- `apply()` returns `createTransformResult({ verify })` — `Transformer` runs commit + flush + `verify()` after `apply()`.
- `verify()` returns `createVerifyResult()` — verification passed.
- `verify()` returns `createVerifyResult({ rollback })` — verification failed; `Transformer` calls `rollback()`.

## Diagram

```mermaid
flowchart TD
  vitestify["Vitestify"]
  transformer["Transformer"]
  transform["Transform"]
  transformResult(["TransformResult"])
  verifyResult(["VerifyResult"])
  tree["Tree"]
  commandFlusher(["CommandFlusher"])
  commandRunner(["CommandRunner"])

  vitestify -->|"transform({workspace: Workspace}): Promise<void>"| transformer
  transformer -->|"apply({workspace: WritableWorkspace}): Promise<TransformResult>"| transform
  transform --> transformResult
  transformer -->|"commit(): Promise<void>"| tree
  transformer -->|"flush({workspace: Workspace}): Promise<void>"| commandFlusher
  commandFlusher -->|"run({command: Command}): Promise<string>"| commandRunner
  transformer -->|"verify(): Promise<VerifyResult>"| transformResult
  transformer -->|"rollback?(): Promise<void>"| verifyResult
```

### Checkpoint cycle (verifying transform)

```mermaid
flowchart LR
  apply["apply() → TransformResult"] --> commit["Tree.commit()"]
  commit --> flush["CommandFlusher.flush()"]
  flush --> verify["result.verify()"]
  verify --> verifyResult["VerifyResult"]
  verifyResult -->|no rollback| next["next transform"]
  verifyResult -->|rollback defined| rollback["result.rollback()"]
  rollback --> next
```

# PR Plan

```mermaid
flowchart LR
  pr1["PR#1 — TransformResult + VerifyResult types"]
  pr2["PR#2 — CommandFlusher + queue drain"]
  pr3["PR#3 — Transformer checkpoint cycle"]
  pr4["PR#4 — jest-test verify/rollback"]

  pr1 --> pr3
  pr2 --> pr3
  pr3 --> pr4
```

# ✅ PR#1 — Add TransformResult, VerifyResult, createTransformResult, createVerifyResult; change Transform.apply() to return Promise\<TransformResult\>

## Tasks

- [x] Change `Transform.apply()` return type to `Promise<TransformResult>`.
- [x] Add `createTransformResult()` and `createVerifyResult()` factories.
- [x] `createTransformResult()` — no `verify`; for transforms without verification.
- [x] `createTransformResult({ verify })` — for transforms that opt into verification.
- [x] `createVerifyResult()` — no `rollback`; verification passed.
- [x] `createVerifyResult({ rollback })` — verification failed; `rollback` encapsulates per-transform undo logic (e.g. jest-test closes over `failedFiles`).
- [x] Transform groups (`defineTransformGroup`) compose child `apply()` calls; only the group wrapper returns a result with `verify` if the group opts in.

## Testing Strategy

_None — pure type/factory addition, exercised indirectly by PR#3's Transformer tests._

# ✅ PR#2 — Rename Finalizer → CommandFlusher; add CommandQueue.drain(); wire into Transformer constructor

## Tasks

- [x] Rename `Finalizer` → `CommandFlusher`; move from end-of-pipeline-only to injected dependency on `Transformer`.
- [x] Add `CommandQueue.drain(): Command[]` (or equivalent) so `CommandFlusher.flush()` runs only commands queued since the last flush.

## Testing Strategy

### ✅ Drains queued commands on flush

- Arrange workspace with 2 queued commands.
- Run `commandFlusher.flush(workspace)`.
- Assert both commands executed via `CommandRunner`.
- Assert command queue is empty after flush.

### ✅ Continues after command failure

- Arrange workspace with 2 commands; first fails, second succeeds.
- Run `commandFlusher.flush(workspace)`.
- Assert both commands were attempted; second still runs.

# 🚧 PR#3 — Implement checkpoint cycle in Transformer; remove end-of-pipeline finalize from Vitestify

## Tasks

- [ ] `Transformer` runs checkpoint cycle when `result.verify !== undefined`.
- [ ] For verifying transforms: after `apply()`, call `tree.commit()`, then `commandFlusher.flush(workspace)`, then `result.verify()`, then `verifyResult.rollback()` when `rollback` is defined.
- [ ] For non-verifying transforms: `apply()` returns `createTransformResult()`; staged changes stay in `Tree` until the next checkpoint or end-of-run commit.
- [ ] Remove `Vitestify`'s end-of-pipeline `finalizer.finalize()` — command flushing is owned by `Transformer` checkpoints and a final flush at end of run.
- [ ] End of run: `tree.commit()` for any remaining staged changes, then `commandFlusher.flush()` for any remaining queued commands.
- [ ] `rollback()` runs after disk is up to date — it may stage reversions via `Tree` and call `tree.commit()` again.

## Testing Strategy

### 🚧 Non-verifying transform does not flush before the next transform runs

- Arrange transform A (no `verify`) that stages a change to file A.
- Arrange transform B (no `verify`), inlined in the test: its `apply()` reads file A from the filesystem and stores the result in a variable before staging its own change.
- Run `Transformer.transform(workspace)`.
- Assert the variable was never written (stays `undefined`) — B's `apply()` ran before any commit/flush occurred, so file A wasn't yet on disk to read.

### 🚧 Pipeline continues to the next transform after a non-verifying transform

- Arrange transform A (no `verify`) that stages a change to file A.
- Arrange transform B (no `verify`), inlined in the test: its `apply()` sets a variable to `true` and stages a change to file B.
- Run `Transformer.transform(workspace)`.
- Assert the variable is `true` — B's `apply()` ran after A, and both files end up on disk with migrated content once the run finishes.

### 🚧 Non-verifying transform's change is batched with the next checkpoint, not flushed early

- Arrange transform A (no `verify`) that stages a change to file A, followed by transform B (`verify`) that stages a change to file B.
- B's `verify()` reads both file A and file B from the filesystem.
- Run `Transformer.transform(workspace)`.
- Assert `verify()` observes both file A and file B already on disk with their migrated content — A's staged change was carried forward and flushed together with B's checkpoint, rather than being flushed separately right after A ran.

### 🚧 Transform with verify succeeds when file is on disk

- Arrange a fake transform whose `apply()` stages a file change and returns `createTransformResult({ verify })`.
- `verify()` reads the file from the filesystem and returns `createVerifyResult()` if the expected content is there, otherwise `createVerifyResult({ rollback })`.
- Run `Transformer.transform(workspace)`.
- Assert the file is present on the real filesystem with the migrated content (proves commit + flush ran before `verify()`).
- Assert the file still has the migrated content after the run (no rollback triggered).

### 🚧 Transform with verify rolls back by renaming the file on disk

- Arrange a fake transform whose `apply()` stages a file change and returns `createTransformResult({ verify })`.
- `verify()` reads the file from the filesystem, determines it failed, and returns `createVerifyResult({ rollback })` where `rollback()` renames the file on disk (e.g. `.spec.ts` → `.jest.ts`) and restores the original content.
- Run `Transformer.transform(workspace)`.
- Assert the file no longer exists at its migrated path.
- Assert the renamed file exists on disk with the original (pre-migration) content.

### 🚧 Pipeline continues to the next transform after a rollback

- Arrange transform A whose `apply()` stages a file change and returns `createTransformResult({ verify })`; `verify()` fails and returns `createVerifyResult({ rollback })`.
- Arrange transform B (no `verify`), inlined in the test: its `apply()` sets a variable to `true` and stages a change to file B.
- Run `Transformer.transform(workspace)`.
- Assert the variable is `true` — B's `apply()` still ran after A's rollback, and file B ends up on disk with migrated content once the run finishes.

# 🚧 PR#4 — jest-test apply() returns TransformResult with verify; implement Vitest run and per-file rollback

## Tasks

- [ ] jest-test `apply()` returns `createTransformResult({ verify })` closing over transformed files and their original content.
- [ ] jest-test `verify()` runs Vitest via `CommandRunner`; on success returns `createVerifyResult()`; on failure returns `createVerifyResult({ rollback })`.

## Testing Strategy

### 🚧 Verify returns VerifyResult with rollback on failure

- Arrange workspace with 2 converted spec files; fake Vitest output reports 1 failure.
- Run `apply()`, then `result.verify()` on returned `TransformResult`.
- Assert `verify()` returns `createVerifyResult({ rollback })`.

### 🚧 Rollback reverts only failed files

- Arrange `VerifyResult` from jest-test verify with one failing file renamed `.jest.cts` → `.spec.ts`.
- Call `result.rollback()`.
- Assert failed file is renamed back to `.jest.cts` with original Jest content restored.
- Assert passing file remains `.spec.ts` with Vitest content.

# Alternatives Considered

- **Git-based rollback** (`git stash`/`reset`/`revert`) — rejected; couples vitestify to the target repo's git state (dirty tree, detached HEAD, no git at all) and can't scope to a single transform's changes without extra bookkeeping.
- **Whole-`Tree` snapshot/restore per transform** — rejected; reverting the whole `Tree` on failure would also discard other transforms' already-staged changes batched into the same checkpoint, not just the failing transform's.
- **Unconditional `rollback()` on every transform** (defined upfront on `Transform`/`TransformResult` regardless of outcome) — rejected in favor of `VerifyResult.rollback()`, returned only when verification fails; keeps non-verifying transforms free of rollback plumbing and makes "did this fail" explicit in the type.
- **Global rollback of the entire migration on any verify failure** — rejected; defeats the goal of best-effort migration where passing files stay migrated and only failing ones fall back to Jest.
- **Auto-retry the transform on verify failure** — rejected; could mask flaky failures or loop without making progress, and hides the failure from the user instead of surfacing a mixed Vitest/Jest result.
- **Keep `Finalizer` end-of-pipeline-only, add a separate verify-only pass after** — rejected; would need duplicate command-running/commit logic to get real on-disk state mid-pipeline, instead of `Transformer` calling `CommandFlusher` directly as part of the checkpoint cycle.

# Future Work

## vitest-config transform verification

- After commit + `CommandFlusher`, verify runs Vitest in a lightweight mode (config loads, no test execution).
- On failure, rollback reverts vitest config / setup file changes staged by that transform.

# Kitchen Sink

<!-- Section 9 — to be filled -->
