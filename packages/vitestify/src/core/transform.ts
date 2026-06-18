import type { Finding } from './finding';
import type { Workspace } from './workspace';

export interface Transform {
  apply(workspace: Workspace, findings: Finding[]): Promise<void>;
}
