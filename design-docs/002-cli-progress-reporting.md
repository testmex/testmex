# Goals

- Give vitestify CLI users live feedback during long runs.
- Today the CLI is silent unless `DEBUG=vitestify:*` is set.
- Report progress during scan, transform, and finalize (analyze runs without progress output).
- Use `@clack/prompts` for TTY output (spinners and progress bars).
- Show progress automatically when stdout is a TTY.
- Keep domain/pipeline code decoupled from clack via a `ProgressReporter` port.

# Non-Goals

- Structured logging or log levels — keep `debug()` for diagnostics only.
- CI-specific progress output (GitHub Actions annotations, etc.).
- Per-heuristic progress during analyze — heuristics are fast; analyze stays silent.
- Per-file detail during transform — only phase-level and count-based feedback.
- Refactoring enrichers to share a single scan pass (separate concern).
- Progress when stdout is not a TTY (piped/redirected output stays silent).

# Desired Behavior

- [ ] When the user runs `vitestify` on a TTY, a spinner appears immediately.
- [ ] During scanning, one spinner per enricher shows the enricher name (e.g. "Scanning: code").
- [ ] Enrichers that scan files update the spinner with a live count (e.g. "Scanning: code… 142 files").
- [ ] Enrichers that do other work update with contextual detail (e.g. "Scanning: nx… loading nx graph").
- [ ] Enrichers that finish quickly may not call `onProgress` — spinner stays at the enricher name.
- [ ] Rapid scan updates are throttled by `ThrottledProgressReporter` (at most once every 100ms) — not in `Scanner` or enrichers.
- [ ] When each enricher completes, clack shows a green stop message (e.g. "Scanned: code").
- [ ] During transform, a spinner shows the current transform name.
- [ ] When transform completes, clack shows a green stop message.
- [ ] During finalize, a spinner shows the command being run (e.g. "Running command: npm install vitest").
- [ ] When each command completes, clack shows a green stop message (e.g. "Command done: npm install vitest").
- [ ] When stdout is not a TTY, no progress output is shown (existing silent behavior).
- [ ] `DEBUG=vitestify:*` continues to work alongside progress output.

# Design

- Add a `ProgressReporter` port with a minimal spinner API.
- `ClackProgressReporter` in infra wraps `@clack/prompts` spinner; no-ops when not a TTY.
- `ThrottledProgressReporter` decorates any `ProgressReporter` and throttles `message()` calls.
- CLI wires `ThrottledProgressReporter(ClackProgressReporter)` — pipeline stages stay unaware of throttling.
- Replace `FileSystem.scanDirectory()` return type with `AsyncIterable<RelativePath>` backed by `globbyStream`.
- Inject `ProgressReporter` into `Vitestify` and pipeline stages that report progress (`Scanner`, `Transformer`, `Finalizer`).
- One spinner per work item (enricher, transform, command) — not one global spinner.

## Scan progress: Scanner owns lifecycle, enrichers own detail

The Scanner orchestrates enrichers but does not discover files itself — each enricher does different work inside `enrich()`:

| Enricher                                               | Work                                       |
| ------------------------------------------------------ | ------------------------------------------ |
| `CodeEnricher`, `TestEnricher`, `VitestConfigEnricher` | Full `scanDirectory()` loop                |
| `JestEnricher`                                         | Three separate full scans + config parsing |
| `PackageManagerEnricher`                               | Reads 1–4 specific lock files              |
| `AngularCliEnricher`                                   | Reads `angular.json`                       |
| `NxEnricher`                                           | Runs `nx graph --print`                    |

Only the enricher knows what it is doing. The Scanner cannot report file counts or status without enricher input.

**Scanner** creates a spinner per enricher, formats messages with the enricher name, and calls `done()` when `enrich()` returns.

**Enrichers** optionally push detail via a narrow `onProgress` callback — not `ProgressReporter` directly. This keeps pack/domain code decoupled from clack while letting each enricher report what makes sense for its work.

```typescript
export interface EnricherOptions {
  workspace: ReadonlyWorkspace;
  onProgress?(detail: string): void;
}

export interface Enricher {
  name: string;
  enrich(options: EnricherOptions): Promise<WorkspaceEnrichment>;
}
```

```typescript
// Scanner formats; enricher supplies detail
const spinner = this._progressReporter.createSpinner();
spinner.message(`Scanning: ${enricher.name}`);

await enricher.enrich({
  workspace: workspace.asReadonly(),
  onProgress: (detail) =>
    spinner.message(`Scanning: ${enricher.name}… ${detail}`),
});

spinner.done(`Scanned: ${enricher.name}`);
```

```typescript
// CodeEnricher — reports file count while scanning
async enrich({ workspace, onProgress }: EnricherOptions) {
  const files = [];
  for await (const path of workspace.tree.scanDirectory()) {
    files.push(path);
    onProgress?.(`${files.length} files`);
  }
}
```

```typescript
// NxEnricher — reports command status
async enrich({ workspace, onProgress }: EnricherOptions) {
  onProgress?.('loading nx graph');
  const graph = await this._runNxGraphCommand();
}
```

Enrichers declare `readonly name` on the class (e.g. `readonly name = 'code'` on `CodeEnricher`).

## Diagram

```mermaid
flowchart TD
  cli["cli.ts"] --> vitestify["Vitestify<br>[progressReporter: ProgressReporter]"]
  vitestify --> scanner["Scanner"]
  vitestify --> analyzer["Analyzer<br>(no progress)"]
  vitestify --> transformer["Transformer"]
  vitestify --> finalizer["Finalizer"]

  cli --> throttledReporter(("ThrottledProgressReporter<br>[duration: 100]"))
  throttledReporter --> clackReporter(("ClackProgressReporter"))
  clackReporter --> clackSpinner["@clack/prompts spinner"]

  scanner --> reporterPort(("ProgressReporter"))
  transformer --> reporterPort
  finalizer --> reporterPort

  reporterPort --> createSpinner["createSpinner():<br>{ message(message: string): void<br>done(message?: string): void }"]

  scanner --> enrichLoop["for each enricher:<br>createSpinner → enrich(context) → done"]
  enrichLoop --> createSpinner
  enrichLoop --> onProgress["onProgress(detail)<br>callback in EnricherOptions"]
  onProgress --> enrichers["Enrichers<br>(code, jest, nx, …)"]
  enrichers --> scanDir["scanDirectory()"]
  enrichers --> otherWork["read files / run commands"]
```

# PR Plan

```mermaid
flowchart LR
  PR1["PR#1<br>Scaffold reporter port"]
  PR2["PR#2<br>Streaming scanDirectory"]
  PR3["PR#3<br>Enricher names + scan progress"]
  PR4["PR#4<br>Pipeline progress + CLI"]

  PR1 --> PR3
  PR2 --> PR3
  PR3 --> PR4
```

# ✅ PR#1 — Scaffold ProgressReporter port and implementations

## Tasks

- [x] Add `ProgressReporter` interface with `createSpinner()` returning `{ message, done }`.
- [x] First `message()` call starts the clack spinner; subsequent calls update the message.
- [x] `done(message?)` stops the spinner with an optional final message.
- [x] Add `ProgressReporterFake` that records `message` and `done` calls for tests.
- [x] Add `ThrottledProgressReporter` decorator that wraps a `ProgressReporter` and throttles `message()` to a configurable duration (default 100ms).
- [x] `ThrottledProgressReporter` always flushes the latest pending message on `done()` — no stale count at phase end.
- [x] Add `ClackProgressReporter` in infra; no-op all methods when `!process.stdout.isTTY`.
- [x] Add `@clack/prompts` dependency to `@testmex/vitestify`.

## Testing Strategy

### ✅ ThrottledProgressReporter keeps pending message until interval elapses

- Wrap a `ProgressReporterFake` with `ThrottledProgressReporter({ duration: 100 })`.
- Call `message('1/5')`, advance timers by 90ms, then call `message('2/5')`.
- Assert inner fake's last message is still `'1/5'`.

### ✅ ThrottledProgressReporter forwards pending message after interval elapses

- Wrap a `ProgressReporterFake` with `ThrottledProgressReporter({ duration: 100 })`.
- Call `message('1/5')`, advance timers by 90ms, call `message('2/5')`, then advance timers by 10ms.
- Assert inner fake's last message is `'2/5'`.

### ✅ ThrottledProgressReporter flushes on done

- Wrap a `ProgressReporterFake` with `ThrottledProgressReporter({ duration: 100 })`.
- Call `message('count: 99')` then immediately `done('count: 99')`.
- Assert inner fake's last message is `'count: 99'` and done message is `'count: 99'`.

# ✅ PR#2 — Migrate FileSystem.scanDirectory to AsyncIterable

## Tasks

- [x] Change `FileSystem.scanDirectory()` to return `AsyncIterable<RelativePath>`.
- [x] Implement `FileSystemImpl.scanDirectory()` with `globbyStream` + `async function*`.
- [x] Update `FileSystemCached`, `Tree`, `FileSystemFake` to match new signature.
- [x] Update enrichers to collect paths: `for await (const path of workspace.tree.scanDirectory())`.

## Testing Strategy

### ✅ Existing scanner integration tests still pass

- Run existing `scanner.spec.ts` cases unchanged.
- Assert workspace detection behavior is identical to before migration.

# ✅ PR#3 — Enricher names, context, and Scanner progress reporting

## Tasks

- [x] Add `EnricherOptions` with `workspace` and optional `onProgress(detail: string)`.
- [x] Update `Enricher.enrich()` signature to accept `EnricherOptions`.
- [x] Give each enricher a `name` (e.g. `'code'`, `'test'`, `'jest'`, `'nx'`).
- [x] Inject `ProgressReporter` into `Vitestify` constructor (default: `NullProgressReporter`).
- [x] Pass reporter to `Scanner`.
- [x] Scanner: one spinner per enricher; create before `enrich()`, `done()` after.
- [x] Scanner: pass `{ onProgress }` callback that prefixes enricher name onto detail.
- [x] `CodeEnricher` calls `onProgress` with incrementing file counts while scanning.
- [x] Non-scanning enrichers call `onProgress` with contextual status where useful (e.g. Nx: `'loading nx graph'`).

## Testing Strategy

### ✅ Scanner reports enricher name and file count from enricher callbacks

- Set up `Scanner` with `ProgressReporterFake`.
- Configure workspace with 5 files.
- Run `scanWorkspace()`.
- Assert messages contain enricher name (e.g. `'code'`) and incrementing file counts (`'1 files'`, `'2 files'`, … `'5 files'`).

### ✅ Scanner calls done once per enricher

- Set up `Scanner` with `ProgressReporterFake`.
- Run `scanWorkspace()` on a workspace with known enricher count.
- Assert `done` was called once per enricher via `Scanned: {name}` messages (not only those that scan files).

### ✅ Non-scanning enricher reports contextual status

- Set up `Scanner` with `ProgressReporterFake` and a workspace that triggers `NxEnricher`.
- Run `scanWorkspace()`.
- Assert messages contain `'nx'` and `'loading nx graph'`.

# 🚧 PR#4 — Transformer, Finalizer progress + CLI wiring

## Tasks

- [x] Pass reporter to `Transformer`, `Finalizer`.
- [x] Transformer: one spinner per transform; `message` with transform name during `apply()`; `done` after each transform completes.
- [ ] Finalizer: one spinner per command; `message` with `Running command: {command}` during `run()`; `done` with `Command done: {command}` after each command completes.
- [ ] CLI wires `new ThrottledProgressReporter(new ClackProgressReporter())` into `Vitestify`.

## Testing Strategy

### ✅ Transformer reports transform name during apply

- Set up `Transformer` with `ProgressReporterFake` and 2 transforms with `name` set.
- Run `transform()`.
- Assert messages contain each transform name.
- Assert `done` called twice via `Transformed: {name}` messages.

### 🚧 Finalizer reports command string during run

- Set up `Finalizer` with `ProgressReporterFake` and workspace with 2 queued commands.
- Run `finalize()`.
- Assert messages contain `Running command: {command}` for each queued command.
- Assert `done` called twice via `Command done: {command}` messages.

# Alternatives Considered

- **ora spinner** — already available transitively in the lockfile, but `@clack/prompts` is chosen for consistent CLI styling with future interactive prompts.
- **Throttle in Scanner** — rejected; throttling belongs in `ThrottledProgressReporter` so pipeline stages stay simple and the concern is reusable/testable.
- **Scanner reports file counts directly** — rejected; the Scanner orchestrates enrichers but does not discover files. Only enrichers know whether they are scanning, reading a config, or running a command.
- **Tree-level progress on** `scanDirectory()` — rejected; multiple enrichers scan independently (Jest scans three times), so tree-level counting would double/triple-count files and miss non-scan work.
- **Inject** `ProgressReporter` **into enrichers** — rejected; enrichers are pack/domain code and should stay decoupled from clack. A narrow `onProgress` callback keeps lifecycle (`createSpinner` / `done`) in the Scanner.
- **Structured progress events** (`{ kind: 'count' }` vs `{ kind: 'status' }`) — deferred; free-form `onProgress(detail: string)` is sufficient for v1. Scanner prefixes enricher name; enricher supplies detail.
- **Per-heuristic analyze progress** — rejected; heuristics run quickly over in-memory workspace state. Progress during analyze would add noise without meaningful feedback. Scan, transform, and finalize remain the slow, user-visible phases.
