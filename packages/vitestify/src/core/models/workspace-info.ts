import { relativePath, type RelativePath } from './relative-path';

export interface Project {
  name?: string;
  path: RelativePath;
}

export interface FileInfo {
  path: RelativePath;
  tags: FileTag[];
}

export interface FileWithProject extends FileInfo {
  project: Project;
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

  getFiles(): FileWithProject[] {
    return this.files.flatMap((file) => {
      const project = this._findProjectForFile(file);

      return project === undefined ? [] : [{ ...file, project }];
    });
  }

  getProjectFiles(nameOrPath: string): FileInfo[] {
    const path = relativePath(nameOrPath);

    return this.getFiles()
      .filter(
        ({ project }) => project.name === nameOrPath || project.path === path,
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

  private _findProjectForFile(file: FileInfo): Project | undefined {
    let match: Project | undefined;

    for (const project of this.projects) {
      if (
        file.path === project.path ||
        file.path.startsWith(`${project.path}/`)
      ) {
        if (match === undefined || project.path.length > match.path.length) {
          match = project;
        }
      }
    }

    return match;
  }
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
