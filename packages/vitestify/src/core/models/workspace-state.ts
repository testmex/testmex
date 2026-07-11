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

export class WorkspaceState {
  private _packageManager: PackageManager;
  private _projects: Project[];
  private readonly _fileTags = new Map<RelativePath, FileTag[]>();
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

  get findings(): readonly Finding[] {
    return this._findings;
  }

  getPackageManager(): PackageManager {
    return this._packageManager;
  }

  getProjects(): readonly Project[] {
    return this._projects;
  }

  getFiles(): FileInfoWithProjects[] {
    return [...this._fileTags.entries()].flatMap(([path, tags]) => {
      const file = { path, tags };
      const projects = _findProjectsForFile(file, this.getProjects());

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
    }

    if (enrichment.packageManager !== undefined) {
      this._packageManager = enrichment.packageManager;
    }
  }

  delete(path: RelativePath): void {
    this._fileTags.delete(path);
    _removeFindingsForPath(this._findings, path);
  }

  rename(originalPath: RelativePath, newPath: RelativePath): void {
    _moveTags(this._fileTags, originalPath, newPath);
    _updateFindingPaths(this._findings, originalPath, newPath);
  }

  tag(path: RelativePath, tag: FileTag): void {
    const tags = this._fileTags.get(path) ?? [];

    if (!tags.includes(tag)) {
      this._fileTags.set(path, [...tags, tag]);
    }
  }
}

export function createWorkspaceState(): WorkspaceState {
  return new WorkspaceState();
}

function _findProjectsForFile(
  file: FileInfo,
  projects: readonly Project[],
): Project[] {
  const matches = projects.filter((project) => {
    const pathRelativeToProject = relative(project.path, file.path);

    return (
      pathRelativeToProject === '' || !pathRelativeToProject.startsWith('..')
    );
  });

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

function _moveTags(
  fileTags: Map<RelativePath, FileTag[]>,
  originalPath: RelativePath,
  newPath: RelativePath,
): void {
  const tags = fileTags.get(originalPath);

  if (tags === undefined) {
    return;
  }

  fileTags.delete(originalPath);

  const existingTags = fileTags.get(newPath) ?? [];
  const mergedTags = [...existingTags];

  for (const tag of tags) {
    if (!mergedTags.includes(tag)) {
      mergedTags.push(tag);
    }
  }

  fileTags.set(newPath, mergedTags);
}

function _removeFindingsForPath(findings: Finding[], path: RelativePath): void {
  for (let index = findings.length - 1; index >= 0; index--) {
    if (findings[index].filePath === path) {
      findings.splice(index, 1);
    }
  }
}

function _updateFindingPaths(
  findings: Finding[],
  originalPath: RelativePath,
  newPath: RelativePath,
): void {
  for (const finding of findings) {
    if (finding.filePath === originalPath) {
      finding.filePath = newPath;
    }
  }
}
