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

export const projectFileTag = {
  jestConfig: 'jest-config',
  nxProjectJson: 'nx-project-json',
  angularJson: 'angular-json',
  test: 'test',
  tsconfig: 'tsconfig',
} as const;

export type ProjectFileTag =
  (typeof projectFileTag)[keyof typeof projectFileTag];

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
