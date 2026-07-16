---
name: style-guide
description: >-
  TypeScript and test style conventions for the testmex monorepo.
  Use when writing or reviewing TypeScript types, interfaces, core domain
  models, or tests in this repository.
---

# Style Guide

## Module layout: main types first

Put the main exported types and functions at the top of the file. Place the types and helper functions they depend on below, ordered from outer to inner.

```typescript
// ✅
export class ProgressReporterFake { /* … */ }

export interface PhaseState {
  steps: readonly StepState[];
}

export interface StepState {
  subSteps: readonly SubStepState[];
}

export interface SubStepState {
  message: string;
}

interface MutablePhaseState { /* … */ }

// ❌ — leaf types before the class that exposes them
export interface SubStepState { /* … */ }
export interface StepState { /* … */ }
export class ProgressReporterFake { /* … */ }
```

## Object shapes: prefer `interface`

Use `interface` for object shapes. Use `type` only when `interface` cannot express the shape (unions, intersections, mapped types, branded primitives).

```typescript
// ✅
export interface Workspace {
  info: WorkspaceState;
  tree: Tree;
}

// ❌
export type Workspace = { info: WorkspaceState; tree: Tree };
```

## Branded strings

Use a branded `string` plus a factory function for domain primitives that must not be confused with plain strings.

```typescript
export type RelativePath = string & { readonly [__relativePathBrand]: true };

export function relativePath(path: string): RelativePath {
  return path as RelativePath;
}

declare const __relativePathBrand: unique symbol;
```

Apply the same pattern to `FindingType` and similar domain strings. Use `findingType()` at call sites.

## Module-level constants

Use `UPPER_SNAKE_CASE` for module-level constant bindings (arrays, config objects, magic strings shared within a file).

```typescript
// ✅
const EXCLUDED_CODE_FILE_NAMES = [
  'jest.config.ts',
  'vitest.config.ts',
] as const;

// ❌
const excludedCodeFileNames = ['jest.config.ts', 'vitest.config.ts'] as const;
```

## Test names

Start test descriptions in lower case: `it('staged write is visible…')`.

Use `Class` or `function` for `describe` suite names — do not use `Class.name` or `function.name` (e.g. `describe(Vitestify, …)` not `describe(Vitestify.name, …)`).

Do not use `it.each` (or `describe.each`). Repeat the test case with a separate `it` for each input.

```typescript
// ✅
it('returns true for src/app.spec.ts', () => {
  expect(isTestFile(relativePath('src/app.spec.ts'))).toBe(true);
});

it('returns true for src/app.test.ts', () => {
  expect(isTestFile(relativePath('src/app.test.ts'))).toBe(true);
});

// ❌
it.each(['src/app.spec.ts', 'src/app.test.ts'])(
  'returns true for %s',
  (path) => {
    expect(isTestFile(relativePath(path))).toBe(true);
  },
);
```

## Assertions

Prefer inlined expected values over variables — the assertion should read as a self-contained statement of what the test checks.

```typescript
// ✅
expect(await tree.maybeReadFile(mainPath)).toBe('console.log("hello");');
expect(tree.changes()).toEqual([{ type: 'delete', path: 'the/main/path.ts' }]);

// ❌
const expectedContent = 'console.log("hello");';
const expectedChanges = [{ type: 'delete', path: mainPath }];
expect(await tree.maybeReadFile(mainPath)).toBe(expectedContent);
expect(tree.changes()).toEqual(expectedChanges);
```

When a test has more than one `expect`, use `expect.soft` so every assertion runs and failures are reported together.

```typescript
// ✅
expect.soft(await tree.maybeReadFile(mainPath)).toBeNull();
expect
  .soft(tree.changes())
  .toEqual([{ type: 'delete', path: 'the/main/path.ts' }]);

// ❌
expect(await tree.maybeReadFile(mainPath)).toBeNull();
expect(tree.changes()).toEqual([{ type: 'delete', path: mainPath }]);
```

A single `expect` in a test may use plain `expect`.
