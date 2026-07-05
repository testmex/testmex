import { relativePath, type RelativePath } from './relative-path';

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
  readonly files: FileInfo[];
  readonly packageManager: PackageManager;
  readonly projects: Project[];

  constructor({
    files = [],
    packageManager = 'npm',
    projects = [],
  }: {
    files?: FileInfo[];
    packageManager?: PackageManager;
    projects?: Project[];
  } = {}) {
    this.files = files;
    this.packageManager = packageManager;
    this.projects = projects;
  }

  getFiles(): FileWithProjects[] {
    return this.files.flatMap((file) => {
      const projects = _findProjectsForFile(file, this.projects);

      return [{ ...file, projects }];
    });
  }

  getProjectFiles(nameOrPath: string): FileInfo[] {
    const path = relativePath(nameOrPath);

    return this.getFiles()
      .filter(({ projects }) =>
        projects.some(
          (project) => project.name === nameOrPath || project.path === path,
        ),
      )
      .map(({ path, tags }) => ({ path, tags }));
  }

  merge(overrides: {
    files?: FileInfo[];
    projects?: Project[];
    packageManager?: PackageManager;
  }): WorkspaceInfo {
    return new WorkspaceInfo({
      files: [...this.files, ...(overrides.files ?? [])],
      projects: [...this.projects, ...(overrides.projects ?? [])],
      packageManager: overrides.packageManager ?? this.packageManager,
    });
  }
}

function _findProjectsForFile(file: FileInfo, projects: Project[]): Project[] {
  const matches = projects.filter(
    (project) =>
      file.path === project.path || file.path.startsWith(`${project.path}/`),
  );

  return _deduplicateProjects(matches);
}

function _deduplicateProjects(projects: Project[]): Project[] {
  const byPath = new Map<RelativePath, Project[]>();

  for (const project of projects) {
    const group = byPath.get(project.path) ?? [];
    group.push(project);
    byPath.set(project.path, group);
  }

  return [...byPath.values()].flatMap(_mergeProjectsAtSamePath);
}

function _mergeProjectsAtSamePath(projects: Project[]): Project[] {
  const names = new Set(
    projects.flatMap((project) =>
      project.name === undefined ? [] : [project.name],
    ),
  );

  if (names.size > 1) {
    return [...names].map((name) => ({ path: projects[0].path, name }));
  }

  const name = names.size === 1 ? [...names][0] : undefined;

  return [{ path: projects[0].path, name }];
}

export function createWorkspaceInfo(): WorkspaceInfo {
  return new WorkspaceInfo();
}

export function mergeWorkspaceInfo(
  workspaceInfo: WorkspaceInfo,
  overrides: {
    files?: FileInfo[];
    projects?: Project[];
    packageManager?: PackageManager;
  },
): WorkspaceInfo {
  return workspaceInfo.merge(overrides);
}
