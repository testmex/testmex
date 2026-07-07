import type { Finding } from '../models/finding';
import { relativePath, type RelativePath } from '../models/relative-path';
import { WorkspaceEnrichment, WorkspaceInfo } from '../models/workspace-info';
import type { Command } from '../ports/command-runner';
import type { ReadonlyTree, Tree } from './tree';

/**
 * This is the workspace aggregate root.
 */
export class Workspace {
  readonly commands: CommandQueue;
  readonly tree: WorkspaceTree;

  private readonly _fileTags = new Map<RelativePath, FileTag[]>();
  private readonly _findings: Finding[] = [];
  private _info: WorkspaceInfo;
  private readonly _tree: Tree;

  constructor({
    info = new WorkspaceInfo(),
    tree,
    commands = new CommandQueue(),
  }: {
    info?: WorkspaceInfo;
    tree: Tree;
    commands?: CommandQueue;
  }) {
    this.commands = commands;
    this._info = info;

    this.tree = this._tree = tree;
  }

  get findings(): readonly Finding[] {
    return this._findings;
  }

  get info(): WorkspaceInfo {
    return this._info;
  }

  asReadonly(): ReadonlyWorkspace {
    return this;
  }

  asWritable(): WritableWorkspace {
    return this;
  }

  getFiles(): FileInfoWithProjects[] {
    return [...this._fileTags.entries()].flatMap(([path, tags]) => {
      const file = { path, tags };
      const projects = _findProjectsForFile(file, this.info.projects);

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

    this._info = this._info.merge({
      projects: enrichment.projects,
      packageManager: enrichment.packageManager,
    });
  }

  delete(path: RelativePath): void {
    this._tree.delete(path);
    this._fileTags.delete(path);
    _removeFindingsForPath(this._findings, path);
  }

  async rename(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): Promise<void> {
    await this._tree.rename(originalPath, newPath);
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
export interface ReadonlyWorkspace
  extends Pick<
    Workspace,
    'info' | 'findings' | 'getFiles' | 'getProjectFiles'
  > {
  readonly tree: ReadonlyTree;
}

export interface WritableWorkspace extends Workspace {
  readonly tree: WorkspaceTree;
}

/**
 * This is the workspace tree that does not allow changes that should go through
 * the Workspace aggregate root.
 */
export type WorkspaceTree = WritableTree & Pick<Tree, 'commit'>;

export type WritableTree = ReadonlyTree &
  Pick<Tree, 'commit' | 'maybeReadFile' | 'maybeReadJsonFile' | 'write'>;

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

export class CommandQueue {
  private readonly _commands: Command[] = [];

  add(command: Command): void {
    this._commands.push(command);
  }

  all(): readonly Command[] {
    return this._commands;
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
