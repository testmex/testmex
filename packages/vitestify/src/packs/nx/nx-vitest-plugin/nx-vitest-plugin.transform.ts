import { relativePath } from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';
import type { Command } from '../../../core/ports/command-runner';

export const nxViteAddCommand = [
  'npx',
  'nx',
  'add',
  '@nx/vite',
] as const satisfies Command;

export const nxVitestAddCommand = [
  'npx',
  'nx',
  'add',
  '@nx/vitest',
] as const satisfies Command;

export const nxVitestPluginTransform = defineTransform({
  apply: async ({ workspace }) => {
    const { commands, tree } = workspace;
    const nxJsonPath = relativePath('nx.json');
    const nxJson = await tree.maybeReadJsonFile<NxJson>(nxJsonPath);

    if (nxJson == null) {
      return;
    }

    const plugins = nxJson.plugins ?? [];
    if (_hasVitestPlugin(plugins)) {
      return;
    }

    nxJson.plugins = [
      ...(nxJson.plugins ?? []),
      {
        plugin: '@nx/vitest',
        options: {
          testTargetName: 'test',
          ciTargetName: 'test-ci',
          testMode: 'watch',
        },
      },
    ];

    await tree.write(nxJsonPath, JSON.stringify(nxJson, null, 2));

    commands.add(nxViteAddCommand);
    commands.add(nxVitestAddCommand);
  },
});

function _hasVitestPlugin(plugins: Array<NxPlugin | string>): boolean {
  return plugins.some((entry) => {
    const pluginName = typeof entry === 'string' ? entry : entry.plugin;
    return pluginName === '@nx/vitest';
  });
}

interface NxJson {
  plugins?: Array<NxPlugin | string>;
}

interface NxPlugin {
  plugin: string;
  options?: Record<string, unknown>;
}
