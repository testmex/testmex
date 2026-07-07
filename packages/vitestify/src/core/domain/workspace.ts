import type { ReadonlyTree, Tree } from './tree';
import type { Command } from '../ports/command-runner';
import type { Finding } from '../models/finding';
import { relativePath, type RelativePath } from '../models/relative-path';
import {
  FileInfo,
  FileTag,
  FileWithProjects,
  Project,
  WorkspaceEnrichment,
  WorkspaceInfo,
} from '../models/workspace-info';

export class CommandQueue {
  private readonly _commands: Command[] = [];

  add(command: Command): void {
    this._commands.push(command);
  }

  all(): readonly Command[] {
    return this._commands;
  }
}

export class ReadonlyWorkspace {
  readonly info: WorkspaceInfo;
  readonly tree: ReadonlyTree;
  protected readonly _fileTags = new Map<RelativePath, FileTag[]>();
  protected readonly _findings: Finding[] = [];

  constructor({
    info = new WorkspaceInfo(),
    tree,
    fileTags = new Map(),
    findings = [],
  }: {
    info?: WorkspaceInfo;
    tree: ReadonlyTree;
    fileTags?: Map<RelativePath, FileTag[]>;
    findings?: Finding[];
  }) {
    this.info = info;
    this.tree = tree;
    this._fileTags = fileTags;
    this._findings = findings;
  }

  get findings(): readonly Finding[] {
    return this._findings;
  }

  getFiles(): FileWithProjects[] {
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
}

export class Workspace extends ReadonlyWorkspace {
  readonly commands: CommandQueue;
  override info: WorkspaceInfo;
  override readonly tree: Tree;

  constructor({
    info,
    tree,
    commands = new CommandQueue(),
  }: {
    info?: WorkspaceInfo;
    tree: Tree;
    commands?: CommandQueue;
  }) {
    super({ info, tree });
    this.commands = commands;
    this.info = info ?? new WorkspaceInfo();
    this.tree = tree;
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

    this.info = this.info.merge({
      projects: enrichment.projects,
      packageManager: enrichment.packageManager,
    });
  }

  asReadonly(): ReadonlyWorkspace {
    return new ReadonlyWorkspace({
      info: this.info,
      tree: this.tree,
      fileTags: this._fileTags,
      findings: this._findings,
    });
  }

  delete(path: RelativePath): void {
    this.tree.delete(path);
    this._fileTags.delete(path);
    _removeFindingsForPath(this._findings, path);
  }

  async rename(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): Promise<void> {
    await this.tree.rename(originalPath, newPath);
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
