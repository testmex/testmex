import { definePack } from '../../core/models/pack';
import { NxEnricher } from './nx-enricher';

export default definePack({
  name: 'nx',
  enricherFactories: [(args) => new NxEnricher(args)],
});
