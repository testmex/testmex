import { Entities } from '../utils/entities';
import type { FindingType, HeuristicResult } from './finding';
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
  findings: FindingType[];
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

export type EnrichmentFileInfo = Omit<FileInfo, 'findings'>;

export interface WorkspaceEnrichment {
  fileInfos?: EnrichmentFileInfo[];
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

  constructor({
    packageManager = 'npm',
    projects = [],
  }: {
    packageManager?: PackageManager;
    projects?: Project[];
  } = {}) {
    this._packageManager = packageManager;
    this._projects = this._deduplicateProjects(projects);
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
      .map(({ path, tags, findings }) => ({ path, tags, findings }));
  }

  applyHeuristicResults(result: HeuristicResult): void {
    for (const { type, filePath } of result.findings) {
      const entity =
        this._fileEntities.get(filePath) ??
        this._fileEntities.create(filePath, {
          path: filePath,
          tags: [],
          findings: [],
        });

      if (!entity.findings.includes(type)) {
        entity.findings = [...entity.findings, type];
      }
    }
  }

  applyEnrichment(enrichment: WorkspaceEnrichment): void {
    for (const fileInfo of enrichment.fileInfos ?? []) {
      for (const tag of fileInfo.tags) {
        this.tag(fileInfo.path, tag);
      }
    }

    if (enrichment.projects !== undefined) {
      this._projects = this._deduplicateProjects([
        ...this._projects,
        ...enrichment.projects,
      ]);
      /* We invalidate instead of recomputing because we will generally
       * receive multiple enrichments during the scanning phase
       * before receiving the getFiles calls during the transform phase. */
      this._fileEntities.invalidateComputedProperty('projects');
    }

    if (enrichment.packageManager !== undefined) {
      this._packageManager = enrichment.packageManager;
    }
  }

  delete(path: RelativePath): void {
    this._fileEntities.delete(path);
  }

  rename(originalPath: RelativePath, newPath: RelativePath): void {
    this._moveFileEntity(originalPath, newPath);
  }

  tag(path: RelativePath, tag: FileTag): void {
    const entity =
      this._fileEntities.get(path) ??
      this._fileEntities.create(path, { path, tags: [], findings: [] });

    if (!entity.tags.includes(tag)) {
      entity.tags = [...entity.tags, tag];
    }
  }

  private _findProjectsForFile(file: FileInfo): Project[] {
    return this._projects.filter((project) =>
      this._fileBelongsToProject(file.path, project.path),
    );
  }

  private _fileBelongsToProject(
    filePath: RelativePath,
    projectPath: RelativePath,
  ): boolean {
    if (projectPath === '.') {
      return true;
    }

    return (
      filePath === projectPath || filePath.startsWith(`${projectPath}/`)
    );
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
        findings: entity.findings,
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

    const mergedFindings = [...existingEntity.findings];

    for (const finding of entity.findings) {
      if (!mergedFindings.includes(finding)) {
        mergedFindings.push(finding);
      }
    }

    existingEntity.findings = mergedFindings;
  }
}
