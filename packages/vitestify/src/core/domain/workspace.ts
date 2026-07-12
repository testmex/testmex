import type { HeuristicResult } from '../models/finding';
import type { RelativePath } from '../models/relative-path';
import {
  type FileInfo,
  type FileInfoWithProjects,
  type FileTag,
  type PackageManager,
  type Project,
  WorkspaceEnrichment,
  WorkspaceState,
} from '../models/workspace-state';
import type { Command } from '../ports/command-runner';
import type { ReadonlyTree, Tree } from './tree';

export type {
  FileInfo,
  FileInfoWithProjects,
  FileTag,
  Project,
} from '../models/workspace-state';
export { fileTag } from '../models/workspace-state';

/**
 * This is a service wrapping the workspace state, commands, and tree.
 */
export class Workspace {
  readonly commands: CommandQueue;
  readonly tree: WorkspaceTree;

  private _state: WorkspaceState;
  private readonly _tree: Tree;

  constructor({
    commands = new CommandQueue(),
    state = new WorkspaceState(),
    tree,
  }: {
    commands?: CommandQueue;
    state?: WorkspaceState;
    tree: Tree;
  }) {
    this.commands = commands;
    this._state = state;

    this.tree = this._tree = tree;
  }

  get files(): FileInfoWithProjects[] {
    return this._state.getFiles();
  }

  get packageManager(): PackageManager {
    return this._state.getPackageManager();
  }

  get projects(): readonly Project[] {
    return this._state.getProjects();
  }

  asReadonly(): ReadonlyWorkspace {
    return this;
  }

  asWritable(): WritableWorkspace {
    return this;
  }

  getProjectFiles(nameOrPath: string): FileInfo[] {
    return this._state.getProjectFiles(nameOrPath);
  }

  applyEnrichment(enrichment: WorkspaceEnrichment): void {
    this._state.applyEnrichment(enrichment);
  }

  applyHeuristicResults(result: HeuristicResult): void {
    this._state.applyHeuristicResults(result);
  }

  delete(path: RelativePath): void {
    this._tree.delete(path);
    this._state.delete(path);
  }

  async rename(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): Promise<void> {
    await this._tree.rename(originalPath, newPath);
    this._state.rename(originalPath, newPath);
  }

  tag(path: RelativePath, tag: FileTag): void {
    this._state.tag(path, tag);
  }
}
export interface ReadonlyWorkspace
  extends Pick<
    Workspace,
    'files' | 'getProjectFiles' | 'packageManager' | 'projects'
  > {
  readonly tree: ReadonlyTree;
}

export interface WritableWorkspace
  extends Pick<
    Workspace,
    | 'commands'
    | 'files'
    | 'packageManager'
    | 'projects'
    | 'getProjectFiles'
    | 'delete'
    | 'rename'
    | 'tag'
  > {
  readonly tree: WorkspaceTree;
}

/**
 * This is the workspace tree that does not allow changes that should go through
 * the Workspace aggregate root.
 */
export type WorkspaceTree = WritableTree & Pick<Tree, 'commit'>;

export type WritableTree = ReadonlyTree &
  Pick<Tree, 'commit' | 'maybeReadFile' | 'maybeReadJsonFile' | 'write'>;

export class CommandQueue {
  private readonly _commands: Command[] = [];

  add(command: Command): void {
    this._commands.push(command);
  }

  all(): readonly Command[] {
    return this._commands;
  }
}
