/**
 * Path relative to the workspace root.
 */
export type RelativePath = string & { readonly [__relativePathBrand]: true };

export function relativePath(path: string): RelativePath {
  /* Normalize empty path to '.'.
   * In some situations, such as angular.json, an empty path is valid. */
  path = path === '' ? '.' : path;
  return path as RelativePath;
}

declare const __relativePathBrand: unique symbol;
