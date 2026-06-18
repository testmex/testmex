import { definePack } from '../../core/models/pack';
import { JestEnricher } from './jest-enricher';
import { jestMockHeuristic } from './jest-mock-heuristic';
import { jestMockTransform } from './jest-mock-transform';

export default definePack({
  name: 'jest',
  enricherFactories: [(args) => new JestEnricher(args)],
  heuristics: [jestMockHeuristic],
  transforms: [jestMockTransform],
});
