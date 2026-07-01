import { definePack } from '../../core/models/pack';
import { CodeEnricher } from './code-enricher';
import { TestEnricher } from './test-enricher';
import { vitestConfigTransform } from './vitest-config/vitest-config.transform';

export default definePack({
  name: 'core',
  enricherFactories: [
    (args) => new CodeEnricher(args),
    (args) => new TestEnricher(args),
  ],
  transforms: [vitestConfigTransform],
});
