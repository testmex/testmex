import { definePack } from '../../core/models/pack';
import { NxEnricher } from './nx.enricher';
import { nxVitestWatchTransform } from './nx-vitest-watch/nx-vitest-watch.transform';
import { nxProjectJsonTransform } from './nx-project-json/nx-project-json.transform';
import { nxJestTargetTransform } from './nx-jest-target/nx-jest-target.transform';
import { nxPluginsTransform } from './nx-plugins/nx-plugins.transform';

export default definePack({
  name: 'nx',
  enricherFactories: [(args) => new NxEnricher(args)],
  transforms: [
    nxJestTargetTransform,
    nxPluginsTransform,
    nxProjectJsonTransform,
    nxVitestWatchTransform,
  ],
});
