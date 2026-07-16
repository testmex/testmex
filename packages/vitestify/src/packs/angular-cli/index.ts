import { definePack } from '../../core/models/pack';
import { angularCliEnricher } from './enrichers/angular-cli.enricher';
import { angularBuilderJestTransform } from './transforms/angular-builder-jest/angular-builder-jest.transform';

export default definePack({
  name: 'angular-cli',
  enrichers: [angularCliEnricher],
  transforms: [angularBuilderJestTransform],
});
