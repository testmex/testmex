import { definePack } from '../../core/models/pack';
import { JestEnricher } from './jest.enricher';
import { jestSymbolHeuristic } from './jest-symbol.heuristic';
import { jestTestTransform } from './jest-test/jest-test.transform';
import { replaceApiHeuristic } from './jest-test/replace-api/replace-api.heuristic';
import { vitestImportsNeededHeuristic } from './jest-test/vitest-imports/vitest-imports-needed.heuristic';
import { configTestMatchTransform } from './config-test-match/config-test-match.transform';
import { configTestPathPatternsTransform } from './config-test-path-patterns/config-test-path-patterns.transform';
import { renameSpecToJestTransform } from './rename-spec-to-jest/rename-spec-to-jest.transform';

export default definePack({
  name: 'jest',
  enricherFactories: [() => new JestEnricher()],
  heuristics: [
    jestSymbolHeuristic,
    replaceApiHeuristic,
    vitestImportsNeededHeuristic,
  ],
  transforms: [
    configTestPathPatternsTransform,
    configTestMatchTransform,
    renameSpecToJestTransform,
    jestTestTransform,
  ],
});
