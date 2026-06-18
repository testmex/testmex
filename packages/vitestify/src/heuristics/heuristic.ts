import type { Finding } from '../core/finding';
import type { Workspace } from '../core/workspace';

export interface Heuristic {
  inspect(workspace: Workspace): Promise<Finding[]>;
}
