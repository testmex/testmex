import { relative } from 'node:path/posix';
import type {
  FileInfo,
  FileInfoWithProjects,
  FileTag,
  Project,
} from '../domain/workspace';
import type { Finding } from './finding';
import { relativePath, type RelativePath } from './relative-path';

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface WorkspaceEnrichment {
  fileInfos?: FileInfo[];
  packageManager?: PackageManager;
  projects?: Project[];
}

interface FileState {
  tags: FileTag[];
  cachedProjects?: Project[];
}

export class WorkspaceState {
  private _packageManager: PackageManager;
  private _projects: Project[];
  private readonly _fileStateMap = new Map<RelativePath, FileState>();

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
    return [...this._fileStateMap.entries()].map(([path, state]) => ({
      path,
      tags: state.tags,
      projects: this._getProjectsForFile(path),
    }));
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
      this._invalidateAllProjectCaches();
    }

    if (enrichment.packageManager !== undefined) {
      this._packageManager = enrichment.packageManager;
    }
  }

  delete(path: RelativePath): void {
    this._fileStateMap.delete(path);
    this._removeFindingsForPath(path);
  }

  rename(originalPath: RelativePath, newPath: RelativePath): void {
    this._moveFileState(originalPath, newPath);
    this._updateFindingPaths(originalPath, newPath);
  }

  tag(path: RelativePath, tag: FileTag): void {
    const state = this._getOrCreateFileState(path);

    if (!state.tags.includes(tag)) {
      state.tags = [...state.tags, tag];
    }
  }

  private _getOrCreateFileState(path: RelativePath): FileState {
    const existing = this._fileStateMap.get(path);

    if (existing !== undefined) {
      return existing;
    }

    const state: FileState = { tags: [] };
    this._fileStateMap.set(path, state);

    return state;
  }

  private _getProjectsForFile(path: RelativePath): Project[] {
    const state = this._fileStateMap.get(path);

    if (state === undefined) {
      return [];
    }

    if (state.cachedProjects !== undefined) {
      return state.cachedProjects;
    }

    return (state.cachedProjects = this._findProjectsForFile({
      path,
      tags: state.tags,
    }));
  }

  private _findProjectsForFile(file: FileInfo): Project[] {
    const matches = this.getProjects().filter((project) => {
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

  private _moveFileState(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): void {
    const state = this._fileStateMap.get(originalPath);

    if (state === undefined) {
      return;
    }

    this._fileStateMap.delete(originalPath);

    const existingState = this._fileStateMap.get(newPath);

    if (existingState === undefined) {
      state.cachedProjects = undefined;
      this._fileStateMap.set(newPath, state);

      return;
    }

    const mergedTags = [...existingState.tags];

    for (const tag of state.tags) {
      if (!mergedTags.includes(tag)) {
        mergedTags.push(tag);
      }
    }

    existingState.tags = mergedTags;
  }

  private _invalidateAllProjectCaches(): void {
    for (const state of this._fileStateMap.values()) {
      state.cachedProjects = undefined;
    }
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
