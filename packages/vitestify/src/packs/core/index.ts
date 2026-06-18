import { definePack } from '../../core/pack';
import { TestEnricher } from './test-enricher';

export default definePack({
  name: 'core',
  enricherFactories: [(args) => new TestEnricher(args)],
});
