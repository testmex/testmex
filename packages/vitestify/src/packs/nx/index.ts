import { definePack } from '../../core/models/pack';
import { NxEnricher } from './nx-enricher';
import { nxProjectJsonTransform } from './nx-project-json/nx-project-json.transform';
import { nxVitestPluginTransform } from './nx-vitest-plugin/nx-vitest-plugin.transform';

export default definePack({
  name: 'nx',
  enricherFactories: [(args) => new NxEnricher(args)],
  transforms: [nxProjectJsonTransform, nxVitestPluginTransform],
});
