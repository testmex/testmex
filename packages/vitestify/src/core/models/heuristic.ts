import type { Finding } from './finding';
import type { ReadonlyWorkspace } from '../domain/workspace';

export interface Heuristic {
  inspect(workspace: ReadonlyWorkspace): Promise<Finding[]>;
}

export function defineHeuristic(args: Heuristic): Heuristic {
  return args;
}
