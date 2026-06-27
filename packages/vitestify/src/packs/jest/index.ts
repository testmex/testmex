import { definePack } from '../../core/models/pack';
import { JestEnricher } from './jest-enricher';
import { jestSymbolHeuristic } from './jest-symbol.heuristic';
import { jestTestTransform } from './jest-test/jest-test.transform';
import { replaceApiHeuristic } from './jest-test/replace-api/replace-api.heuristic';
import { snapHeuristic } from './jest-test/snap/snap.heuristic';
import { vitestImportsHeuristic } from './jest-test/vitest-imports/vitest-imports.heuristic';
import { configTestPathPatternsTransform } from './config-test-path-patterns/config-test-path-patterns.transform';

export default definePack({
  name: 'jest',
  enricherFactories: [(args) => new JestEnricher(args)],
  heuristics: [
    jestSymbolHeuristic,
    replaceApiHeuristic,
    snapHeuristic,
    vitestImportsHeuristic,
  ],
  transforms: [configTestPathPatternsTransform, jestTestTransform],
});
