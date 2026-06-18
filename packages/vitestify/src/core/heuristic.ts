import type { Finding } from './finding';
import type { Workspace } from './workspace';

export interface Heuristic {
  inspect(workspace: Workspace): Promise<Finding[]>;
}
