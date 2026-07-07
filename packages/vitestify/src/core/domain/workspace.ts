import type { ReadonlyTree, Tree } from './tree';
import type { Command } from '../ports/command-runner';
import { relativePath, type RelativePath } from '../models/relative-path';
import type {
  FileInfo,
  FileWithProjects,
  Project,
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

  constructor({ info, tree }: { info: WorkspaceInfo; tree: ReadonlyTree }) {
    this.info = info;
    this.tree = tree;
  }

  getFiles(): FileWithProjects[] {
    return this.tree.getFiles().flatMap((file) => {
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
  override readonly tree: Tree;

  constructor({
    info,
    tree,
    commands = new CommandQueue(),
  }: {
    info: WorkspaceInfo;
    tree: Tree;
    commands?: CommandQueue;
  }) {
    super({ info, tree });
    this.commands = commands;
    this.tree = tree;
  }

  asReadonly(): ReadonlyWorkspace {
    return new ReadonlyWorkspace({ info: this.info, tree: this.tree });
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
