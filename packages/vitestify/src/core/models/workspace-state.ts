import type { FileInfo, Project } from '../domain/workspace';

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface WorkspaceEnrichment {
  fileInfos?: FileInfo[];
  packageManager?: PackageManager;
  projects?: Project[];
}

export class WorkspaceState {
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
  }): WorkspaceState {
    return new WorkspaceState({
      projects: [...this.projects, ...(overrides.projects ?? [])],
      packageManager: overrides.packageManager ?? this.packageManager,
    });
  }
}

export function createWorkspaceState(): WorkspaceState {
  return new WorkspaceState();
}
