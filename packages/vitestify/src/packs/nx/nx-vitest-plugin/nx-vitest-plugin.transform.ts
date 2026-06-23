import { defineTransform } from '../../../core/models/transform';
import { relativePath } from '../../../core/models/relative-path';
import type { Command } from '../../../core/ports/command-runner';

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

    commands.add(nxVitestAddCommand);
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
