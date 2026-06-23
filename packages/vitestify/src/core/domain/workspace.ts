import type { ReadonlyTree, Tree } from './tree';
import type { Command } from '../ports/command-runner';
import type { WorkspaceInfo } from '../models/workspace-info';

export class CommandQueue {
  private readonly _commands: Command[] = [];

  add(command: Command): void {
    this._commands.push(command);
  }

  all(): readonly Command[] {
    return this._commands;
  }
}

export interface Workspace {
  commands: CommandQueue;
  info: WorkspaceInfo;
  tree: Tree;
}

export interface ReadonlyWorkspace {
  info: WorkspaceInfo;
  tree: ReadonlyTree;
}

export function defineWorkspace({
  info,
  tree,
  commands = new CommandQueue(),
}: {
  info: WorkspaceInfo;
  tree: Tree;
  commands?: CommandQueue;
}): Workspace {
  return { info, tree, commands };
}
