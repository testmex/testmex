import { relativePath } from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';

export const nxPluginJestTargetTransform = defineTransform({
  name: 'nx-plugin-jest-target',
  apply: async ({ workspace }) => {
    const { tree } = workspace;
    const nxJsonPath = relativePath('nx.json');
    const nxJson = await tree.maybeReadJsonFile<NxJson>(nxJsonPath);

    if (nxJson == null) {
      return;
    }

    const plugins = nxJson.plugins ?? [];
    if (plugins.length === 0) {
      return;
    }

    nxJson.plugins = plugins.map((entry) => _normalizePluginForJest(entry));

    await tree.write(nxJsonPath, JSON.stringify(nxJson, null, 2));
  },
});

/**
 * @deprecated 🚧 work in progress
 */
function _normalizePluginForJest(entry: NxPlugin | string): NxPlugin {
  throw new Error('🚧 work in progress');
}

interface NxJson {
  plugins?: Array<NxPlugin | string>;
}

interface NxPlugin {
  plugin: string;
  options?: Record<string, unknown>;
}
