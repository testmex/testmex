import type { Tree } from './tree';
import type { WorkspaceInfo } from './workspace-info';

export interface Workspace {
  info: WorkspaceInfo;
  tree: Tree;
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
