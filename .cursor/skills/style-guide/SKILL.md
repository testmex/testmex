---
name: style-guide
description: >-
  TypeScript and test style conventions for the testmex monorepo.
  Use when writing or reviewing TypeScript types, interfaces, core domain
  models, or tests in this repository.
---

# Style Guide

## Object shapes: prefer `interface`

Use `interface` for object shapes. Use `type` only when `interface` cannot express the shape (unions, intersections, mapped types, branded primitives).

```typescript
// ✅
export interface Workspace {
  info: WorkspaceInfo;
  tree: Tree;
}

// ❌
export type Workspace = { info: WorkspaceInfo; tree: Tree };
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
const EXCLUDED_CODE_FILE_NAMES = ['jest.config.ts', 'vitest.config.ts'] as const;

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
it.each(['src/app.spec.ts', 'src/app.test.ts'])('returns true for %s', (path) => {
  expect(isTestFile(relativePath(path))).toBe(true);
});
```
