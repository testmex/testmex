import type { HeuristicResult } from './finding';
import type { ReadonlyWorkspace } from '../domain/workspace';

export interface Heuristic {
  name: string;
  inspect(workspace: ReadonlyWorkspace): Promise<HeuristicResult>;
}

export function defineHeuristic(args: Heuristic): Heuristic {
  return args;
}
