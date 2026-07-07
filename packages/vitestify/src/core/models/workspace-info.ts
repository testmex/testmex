import type { RelativePath } from './relative-path';

export interface Project {
  name?: string;
  path: RelativePath;
}

export interface FileInfo {
  path: RelativePath;
  tags: FileTag[];
}

export interface FileWithProjects extends FileInfo {
  projects: Project[];
}

export type FileTag = string & {
  readonly [__fileTagBrand]: true;
};

export function fileTag(tag: string): FileTag {
  return tag as FileTag;
}

declare const __fileTagBrand: unique symbol;

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export class WorkspaceInfo {
  readonly packageManager: PackageManager;
  readonly projects: Project[];

  constructor({
    packageManager = 'npm',
    projects = [],
  }: {
    packageManager?: PackageManager;
    projects?: Project[];
  } = {}) {
    this.packageManager = packageManager;
    this.projects = projects;
  }

  merge(overrides: {
    projects?: Project[];
    packageManager?: PackageManager;
  }): WorkspaceInfo {
    return new WorkspaceInfo({
      projects: [...this.projects, ...(overrides.projects ?? [])],
      packageManager: overrides.packageManager ?? this.packageManager,
    });
  }
}

export function createWorkspaceInfo(): WorkspaceInfo {
  return new WorkspaceInfo();
}

export function mergeWorkspaceInfo(
  workspaceInfo: WorkspaceInfo,
  overrides: {
    projects?: Project[];
    packageManager?: PackageManager;
  },
): WorkspaceInfo {
  return workspaceInfo.merge(overrides);
}
