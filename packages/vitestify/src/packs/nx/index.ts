import { definePack } from '../../core/models/pack';
import { nxEnricher } from './enrichers/nx.enricher';
import { nxVitestWatchTransform } from './transforms/nx-vitest-watch/nx-vitest-watch.transform';
import { nxProjectJsonTransform } from './transforms/nx-project-json/nx-project-json.transform';
import { nxJestTargetTransform } from './transforms/nx-jest-target/nx-jest-target.transform';
import { nxPluginsTransform } from './transforms/nx-plugins/nx-plugins.transform';

export default definePack({
  name: 'nx',
  enrichers: [nxEnricher],
  transforms: [
    nxJestTargetTransform,
    nxPluginsTransform,
    nxProjectJsonTransform,
    nxVitestWatchTransform,
  ],
});
