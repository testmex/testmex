import { definePack } from '../../core/models/pack';
import { jestEnricher } from './enrichers/jest.enricher';
import { jestSymbolHeuristic } from './heuristics/jest-symbol/jest-symbol.heuristic';
import { jestTestTransform } from './transforms/jest-test/jest-test.transform';
import { jestFocusSkipShorthandHeuristic } from './heuristics/jest-focus-skip-shorthand/jest-focus-skip-shorthand.heuristic';
import { vitestImportsNeededHeuristic } from './heuristics/vitest-imports-needed/vitest-imports-needed.heuristic';
import { configTestMatchTransform } from './transforms/config-test-match/config-test-match.transform';
import { configTestPathPatternsTransform } from './transforms/config-test-path-patterns/config-test-path-patterns.transform';

export default definePack({
  name: 'jest',
  enrichers: [jestEnricher],
  heuristics: [
    jestSymbolHeuristic,
    jestFocusSkipShorthandHeuristic,
    vitestImportsNeededHeuristic,
  ],
  transforms: [
    configTestPathPatternsTransform,
    configTestMatchTransform,
    jestTestTransform,
  ],
});
