import { relative } from 'node:path/posix';
import { Entities } from '../entities';
import type { Finding } from './finding';
import { relativePath, type RelativePath } from './relative-path';

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface Project {
  name?: string;
  path: RelativePath;
}

export interface FileInfo {
  path: RelativePath;
  tags: FileTag[];
}

export interface FileInfoWithProjects extends FileInfo {
  projects: Project[];
}

export type FileTag = string & {
  readonly [__fileTagBrand]: true;
};

export function fileTag(tag: string): FileTag {
  return tag as FileTag;
}

declare const __fileTagBrand: unique symbol;

export interface WorkspaceEnrichment {
  fileInfos?: FileInfo[];
  packageManager?: PackageManager;
  projects?: Project[];
}

export class WorkspaceState {
  private _packageManager: PackageManager;
  private _projects: Project[];
  private readonly _fileEntities = new Entities<
    RelativePath,
    FileInfo,
    { projects: Project[] }
  >({
    computed: {
      projects: (entity) => this._findProjectsForFile(entity),
    },
  });

  private readonly _findings: Finding[] = [];

  constructor({
    packageManager = 'npm',
    projects = [],
  }: {
    packageManager?: PackageManager;
    projects?: Project[];
  } = {}) {
    this._packageManager = packageManager;
    this._projects = projects;
  }

  getFindings(): readonly Finding[] {
    return this._findings;
  }

  getPackageManager(): PackageManager {
    return this._packageManager;
  }

  getProjects(): readonly Project[] {
    return this._projects;
  }

  getFiles(): FileInfoWithProjects[] {
    return this._fileEntities.values() as FileInfoWithProjects[];
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

  addFindings(findings: Finding[]): void {
    this._findings.push(...findings);
  }

  applyEnrichment(enrichment: WorkspaceEnrichment): void {
    for (const fileInfo of enrichment.fileInfos ?? []) {
      for (const tag of fileInfo.tags) {
        this.tag(fileInfo.path, tag);
      }
    }

    if (enrichment.projects !== undefined) {
      this._projects = [...this._projects, ...enrichment.projects];
      /* We invalidate instead of recomputing because we will generally
       * receive multiple enrichments during the scanning phase
       * before receiving the getFiles calls during the transform phase. */
      this._fileEntities.invalidateLazyProperty('projects');
    }

    if (enrichment.packageManager !== undefined) {
      this._packageManager = enrichment.packageManager;
    }
  }

  delete(path: RelativePath): void {
    this._fileEntities.delete(path);
    this._removeFindingsForPath(path);
  }

  rename(originalPath: RelativePath, newPath: RelativePath): void {
    this._moveFileEntity(originalPath, newPath);
    this._updateFindingPaths(originalPath, newPath);
  }

  tag(path: RelativePath, tag: FileTag): void {
    const entity =
      this._fileEntities.get(path) ??
      this._fileEntities.create(path, { path, tags: [] });

    if (!entity.tags.includes(tag)) {
      entity.tags = [...entity.tags, tag];
    }
  }

  private _findProjectsForFile(file: FileInfo): Project[] {
    const matches = this._projects.filter((project) => {
      const pathRelativeToProject = relative(project.path, file.path);

      return (
        pathRelativeToProject === '' || !pathRelativeToProject.startsWith('..')
      );
    });

    return this._deduplicateProjects(matches);
  }

  private _deduplicateProjects(projects: Project[]): Project[] {
    const byPath = new Map<RelativePath, Project[]>();

    for (const project of projects) {
      const group = byPath.get(project.path) ?? [];
      group.push(project);
      byPath.set(project.path, group);
    }

    return [...byPath.values()].flatMap((projectsAtPath) =>
      this._mergeProjectsAtSamePath(projectsAtPath),
    );
  }

  private _mergeProjectsAtSamePath(projects: Project[]): Project[] {
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

  private _moveFileEntity(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): void {
    const entity = this._fileEntities.get(originalPath);

    if (entity === undefined) {
      return;
    }

    this._fileEntities.delete(originalPath);

    const existingEntity = this._fileEntities.get(newPath);

    if (existingEntity === undefined) {
      this._fileEntities.create(newPath, {
        path: newPath,
        tags: entity.tags,
      });
      return;
    }

    const mergedTags = [...existingEntity.tags];

    for (const tag of entity.tags) {
      if (!mergedTags.includes(tag)) {
        mergedTags.push(tag);
      }
    }

    existingEntity.tags = mergedTags;
  }

  private _updateFindingPaths(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): void {
    for (const finding of this._findings) {
      if (finding.filePath === originalPath) {
        finding.filePath = newPath;
      }
    }
  }

  private _removeFindingsForPath(path: RelativePath): void {
    for (let i = this._findings.length - 1; i >= 0; i--) {
      if (this._findings[i].filePath === path) {
        this._findings.splice(i, 1);
      }
    }
  }
}
