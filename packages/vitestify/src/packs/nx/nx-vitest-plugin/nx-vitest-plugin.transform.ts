import { defineTransform } from '../../../core/models/transform';
import { relativePath } from '../../../core/models/relative-path';

export const nxVitestPluginEntry = {
  plugin: '@nx/vitest',
  options: {
    testTargetName: 'test',
    ciTargetName: 'test-ci',
    testMode: 'watch',
  },
} as const;

export const nxVitestPluginTransform = defineTransform({
  apply: async ({ workspace }) => {
    const { tree } = workspace;
    const nxJsonPath = relativePath('nx.json');
    const nxJson = await tree.maybeReadJsonFile<NxJson>(nxJsonPath);

    if (nxJson == null) {
      return;
    }
    const plugins = nxJson.plugins ?? [];

    if (_hasVitestPlugin(plugins)) {
      return;
    }

    nxJson.plugins = [...plugins, nxVitestPluginEntry];

    await tree.write(nxJsonPath, JSON.stringify(nxJson, null, 2));
  },
});

function _hasVitestPlugin(plugins: NxPlugin[]): boolean {
  return plugins.some((entry) => entry.plugin === '@nx/vitest');
}

interface NxJson {
  plugins?: NxPlugin[];
}

interface NxPlugin {
  plugin: string;
  options?: Record<string, unknown>;
}
