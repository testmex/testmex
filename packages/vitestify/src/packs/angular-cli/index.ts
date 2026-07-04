import { definePack } from '../../core/models/pack';
import { AngularCliEnricher } from './angular-cli.enricher';

export default definePack({
  name: 'angular-cli',
  enricherFactories: [(args) => new AngularCliEnricher(args)],
});
