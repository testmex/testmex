import { definePack } from '../../core/models/pack';
import { angularHeuristic } from './heuristics/angular/angular.heuristic';
import { codeEnricher } from './enrichers/code/code.enricher';
import { domHeuristic } from './heuristics/dom/dom.heuristic';
import { packageManagerEnricher } from './enrichers/package-manager/package-manager.enricher';
import { reactHeuristic } from './heuristics/react/react.heuristic';
import { setupFilesTransform } from './transforms/setup-files/setup-files.transform';
import { testEnricher } from './enrichers/test/test.enricher';
import { vitestConfigEnricher } from './enrichers/vitest-config/vitest-config.enricher';
import { testingLibraryHeuristic } from './heuristics/testing-library-heuristic/testing-library-heuristic';
import { testingLibraryJestDomTransform } from './transforms/testing-library-jest-dom/testing-library-jest-dom.transform';
import { tsconfigTransform } from './transforms/tsconfig/tsconfig.transform';
import { vitestConfigTransform } from './transforms/vitest-config/vitest-config.transform';

export default definePack({
  name: 'core',
  enrichers: [
    codeEnricher,
    packageManagerEnricher,
    testEnricher,
    vitestConfigEnricher,
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
