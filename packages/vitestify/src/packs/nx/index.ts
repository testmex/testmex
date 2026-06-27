import { definePack } from '../../core/models/pack';
import { NxEnricher } from './nx-enricher';
import { nxProjectJsonTransform } from './nx-project-json/nx-project-json.transform';
import { nxJestTargetTransform } from './nx-jest-target/nx-jest-target.transform';
import { nxVitestPluginTransform } from './nx-vitest-plugin/nx-vitest-plugin.transform';

export default definePack({
  name: 'nx',
  enricherFactories: [(args) => new NxEnricher(args)],
  transforms: [
    nxProjectJsonTransform,
    nxJestTargetTransform,
    nxVitestPluginTransform,
  ],
});
