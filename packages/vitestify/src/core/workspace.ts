import type { ReadonlyTree, Tree } from './tree';
import type { WorkspaceInfo } from './workspace-info';

export interface Workspace {
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
}: {
  info: WorkspaceInfo;
  tree: Tree;
}): Workspace {
  return { info, tree };
}
