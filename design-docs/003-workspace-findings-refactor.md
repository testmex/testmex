# Goals

- Store deduped `FindingType[]` on each file entity instead of a flat append-only findings array.
- Have heuristics return `HeuristicResult` with flat `{ type, filePath }` entries.
- Update transforms to read findings from `workspace.files`.

# Non-Goals

- Removing or marking findings resolved after transforms.
- Changing jest heuristics to emit distinct finding types instead of sharing `jestSymbol`.

# PR Plan

<details>
<summary>✅ PR#1 — Workspace findings refactor</summary>

## Tasks

- [x] Add `HeuristicResult { findings: { type, filePath }[] }`; remove `Finding` interface
- [x] Add `findings FindingType[]` to `FileInfo`; remove `_findings` array and `getFindings` from `WorkspaceState`
- [x] Replace `addFindings` with `applyHeuristicResults` — merge deduped types onto file entities
- [x] Update `Heuristic` contract, `defineFileContentHeuristic`, and all pack heuristics to return `HeuristicResult`
- [x] Move/merge findings in `_moveFileEntity` on rename; delete removes entity (findings included)
- [x] Update `defineFileTransform`, `vitest-config`, rename transforms to read `file.findings` from `workspace.files`
- [x] Update workspace-state, heuristic, and transform specs for new API

## Testing Strategy

### ✅ stores findings on file info

- Create `WorkspaceState`
- Call `applyHeuristicResults({ findings: [{ type, filePath }] })`
- Assert `getFiles()` includes the file with `findings: [type]`

### ✅ dedupes finding types with the same type on the same file

- Apply the same finding type twice for one file
- Assert `findings` contains the type only once

### ✅ merges multiple types from one heuristic result

- Apply one result with multiple types for the same file
- Assert all types are stored on the file

### ✅ keeps findings after rename

- Apply findings, rename the file
- Assert findings remain on the renamed file entity

### ✅ removes findings after delete

- Apply findings, delete the file
- Assert the file entity (and findings) are gone

</details>
