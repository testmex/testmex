---
name: style-guide
description: >-
  TypeScript style conventions for the testmex monorepo..
  Use when writing or reviewing TypeScript types, interfaces, and core domain
  models in this repository.
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

Apply the same pattern to `FindingTag`, `FindingType`, and similar domain strings. Use `findingTag()` and `findingType()` at call sites.

## Test names

Start test descriptions in lower case: `it('staged write is visible…')`.
