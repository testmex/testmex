import type { WorkspaceInfo } from './workspace-info';

export interface Enricher {
  enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo>;
}
