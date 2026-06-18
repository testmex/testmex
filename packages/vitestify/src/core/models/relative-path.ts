/**
 * Path relative to the workspace root.
 */
export type RelativePath = string & { readonly [__relativePathBrand]: true };

export function relativePath(path: string): RelativePath {
  return path as RelativePath;
}

declare const __relativePathBrand: unique symbol;
