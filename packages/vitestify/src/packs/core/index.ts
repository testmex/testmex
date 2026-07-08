import { definePack } from '../../core/models/pack';
import { angularHeuristic } from './angular.heuristic';
import { CodeEnricher } from './code.enricher';
import { domHeuristic } from './dom.heuristic';
import { PackageManagerEnricher } from './package-manager.enricher';
import { reactHeuristic } from './react.heuristic';
import { setupFilesTransform } from './setup-files/setup-files.transform';
import { TestEnricher } from './test.enricher';
import { VitestConfigEnricher } from './vitest-config.enricher';
import { testingLibraryHeuristic } from './testing-library-heuristic';
import { testingLibraryJestDomTransform } from './testing-library-jest-dom/testing-library-jest-dom.transform';
import { tsconfigTransform } from './tsconfig/tsconfig.transform';
import { vitestConfigTransform } from './vitest-config/vitest-config.transform';

export default definePack({
  name: 'core',
  enricherFactories: [
    () => new CodeEnricher(),
    () => new PackageManagerEnricher(),
    () => new TestEnricher(),
    () => new VitestConfigEnricher(),
  ],
  heuristics: [
    angularHeuristic,
    domHeuristic,
    reactHeuristic,
    testingLibraryHeuristic,
  ],
  transforms: [
    setupFilesTransform,
    testingLibraryJestDomTransform,
    tsconfigTransform,
    vitestConfigTransform,
  ],
});
