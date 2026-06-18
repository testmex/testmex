import type { Heuristic } from '../../core/heuristic';
import { jestMockHeuristic } from './jest-mock-heuristic';

export const heuristics: Heuristic[] = [jestMockHeuristic];
