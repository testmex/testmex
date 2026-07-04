import { definePack } from '../../core/models/pack';
import { angularHeuristic } from './angular.heuristic';
import { CodeEnricher } from './code.enricher';
import { domHeuristic } from './dom.heuristic';
import { testingLibraryJestDomHeuristic } from './testing-library-jest-dom/testing-library-jest-dom.heuristic';
import { testingLibraryJestDomTransform } from './testing-library-jest-dom/testing-library-jest-dom.transform';
import { PackageManagerEnricher } from './package-manager.enricher';
import { TestEnricher } from './test.enricher';
import { vitestConfigTransform } from './vitest-config/vitest-config.transform';

export default definePack({
  name: 'core',
  enricherFactories: [
    (args) => new CodeEnricher(args),
    (args) => new TestEnricher(args),
    (args) => new PackageManagerEnricher(args),
  ],
  heuristics: [angularHeuristic, domHeuristic, testingLibraryJestDomHeuristic],
  transforms: [testingLibraryJestDomTransform, vitestConfigTransform],
});
