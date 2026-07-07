import { definePack } from '../../core/models/pack';
import { angularHeuristic } from './angular.heuristic';
import { reactHeuristic } from './react.heuristic';
import { CodeEnricher } from './code.enricher';
import { domHeuristic } from './dom.heuristic';
import { testingLibraryHeuristic } from './testing-library-heuristic';
import { testingLibraryJestDomTransform } from './testing-library-jest-dom/testing-library-jest-dom.transform';
import { PackageManagerEnricher } from './package-manager.enricher';
import { TestEnricher } from './test.enricher';
import { tsconfigTransform } from './tsconfig/tsconfig.transform';
import { vitestConfigTransform } from './vitest-config/vitest-config.transform';

export default definePack({
  name: 'core',
  enricherFactories: [
    () => new CodeEnricher(),
    () => new TestEnricher(),
    () => new PackageManagerEnricher(),
  ],
  heuristics: [
    angularHeuristic,
    domHeuristic,
    reactHeuristic,
    testingLibraryHeuristic,
  ],
  transforms: [
    testingLibraryJestDomTransform,
    vitestConfigTransform,
    tsconfigTransform,
  ],
});
