import { RelativePath } from './relative-path';

export interface Project {
  name: string;
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

export class WorkspaceInfo {
  readonly projects: Project[];
  readonly files: FileInfo[];

  constructor({
    files = [],
    projects = [],
  }: {
    files?: FileInfo[];
    projects?: Project[];
  } = {}) {
    this.projects = projects;
    this.files = files;
  }

  getFiles(): FileWithProject[] {
    return this.files.flatMap((file) => {
      const project = this._findProjectForFile(file);

      return project === undefined ? [] : [{ ...file, project }];
    });
  }

  getProjectFiles(projectName: string): FileInfo[] {
    return this.getFiles()
      .filter(({ project }) => project.name === projectName)
      .map(({ path, tags }) => ({ path, tags }));
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

  merge(overrides: {
    files?: FileInfo[];
    projects?: Project[];
  }): WorkspaceInfo {
    return new WorkspaceInfo({
      files: [...this.files, ...(overrides.files ?? [])],
      projects: [...this.projects, ...(overrides.projects ?? [])],
    });
  }
}

export function createWorkspaceInfo(): WorkspaceInfo {
  return new WorkspaceInfo();
}

export function mergeWorkspaceInfo(
  workspaceInfo: WorkspaceInfo,
  overrides: { files?: FileInfo[]; projects?: Project[] },
): WorkspaceInfo {
  return workspaceInfo.merge(overrides);
}
