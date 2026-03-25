import { RelativePath } from './relative-path';

export interface WorkspaceInfo {
  workspaceType: 'angular-cli' | 'nx' | null;
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

export function createWorkspaceInfo(): WorkspaceInfo {
  return {
    workspaceType: null,
    projects: []
  }
}

export function mergeWorkspaceInfo(workspaceInfo: WorkspaceInfo, overrides: WorkspaceInfo) {
  return {
    ...workspaceInfo,
    ...overrides,
    projects: [...workspaceInfo.projects, ...overrides.projects]
  }
}
