import { definePack } from '../../core/models/pack';
import { CodeEnricher } from './code-enricher';
import { domHeuristic } from './dom.heuristic';
import { PackageManagerEnricher } from './package-manager-enricher';
import { TestEnricher } from './test-enricher';
import { vitestConfigTransform } from './vitest-config/vitest-config.transform';

export default definePack({
  name: 'core',
  enricherFactories: [
    (args) => new CodeEnricher(args),
    (args) => new TestEnricher(args),
    (args) => new PackageManagerEnricher(args),
  ],
  heuristics: [domHeuristic],
  transforms: [vitestConfigTransform],
});
