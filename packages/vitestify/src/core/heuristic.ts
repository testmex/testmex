import type { Finding } from './finding';
import type { ReadonlyWorkspace } from './workspace';

export interface Heuristic {
  inspect(workspace: ReadonlyWorkspace): Promise<Finding[]>;
}
