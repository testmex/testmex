declare const __relativePathBrand: unique symbol;

export interface WorkspaceInfo {
  workspaceType: 'angular-cli' | 'nx';
  projects: Project[];
}

export interface Project {
  name: string;
  path: RelativePath;
  files: ProjectFile[];
}

export interface ProjectFile {
  path: RelativePath;
  tags: ProjectFileTag[];
}

export type ProjectFileTag =
  | 'jest-config'
  | 'nx-project-json'
  | 'test'
  | 'tsconfig';

/** Path relative to the workspace root. */
export type RelativePath = string & { readonly [__relativePathBrand]: true };

export function relativePath(path: string): RelativePath {
  return path as RelativePath;
}
