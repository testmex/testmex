import { definePack } from '../../core/models/pack';
import { TestEnricher } from './test-enricher';
import { vitestConfigTransform } from './vitest-config/vitest-config.transform';

export default definePack({
  name: 'core',
  enricherFactories: [(args) => new TestEnricher(args)],
  transforms: [vitestConfigTransform],
});
