import { RelativePath } from './relative-path';

export interface WorkspaceInfo {
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

export type ProjectFileTag = string & {
  readonly [__projectFileTagBrand]: true;
};

export function projectFileTag(tag: string): ProjectFileTag {
  return tag as ProjectFileTag;
}

declare const __projectFileTagBrand: unique symbol;

export function createWorkspaceInfo(): WorkspaceInfo {
  return {
    projects: [],
  };
}

export function mergeWorkspaceInfo(
  workspaceInfo: WorkspaceInfo,
  overrides: WorkspaceInfo,
) {
  return {
    ...workspaceInfo,
    ...overrides,
    projects: [...workspaceInfo.projects, ...overrides.projects],
  };
}
