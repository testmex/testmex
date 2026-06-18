import type { Heuristic } from '../../core/heuristic';
import { JestMockHeuristic } from './jest-mock-heuristic';

export const heuristics: Heuristic[] = [new JestMockHeuristic()];
