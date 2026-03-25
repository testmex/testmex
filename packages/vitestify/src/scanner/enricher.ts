import { WorkspaceInfo } from '../core/workspace-info';

export interface Enricher {
  enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo>;
}
