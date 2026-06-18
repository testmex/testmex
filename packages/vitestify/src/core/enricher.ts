import { Tree } from './tree';
import type { WorkspaceInfo } from './workspace-info';

export interface Enricher {
  enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo>;
}

export type EnricherFactory = (args: { tree: Tree }) => Enricher;
