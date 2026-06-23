import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { nxVitestPluginTransform } from './nx-vitest-plugin.transform';

describe('nxVitestPluginTransform', () => {
  it('queues nx add @nx/vitest when plugins is empty', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));
    await workspace.tree.write(relativePath('nx.json'), '{}');

    await runTransform({ workspace, transforms: [nxVitestPluginTransform] });

    expect(workspace.commands.all()).toEqual([
      ['npx', 'nx', 'add', '@nx/vitest'],
    ]);
  });

  it('skips when @nx/vitest plugin already present', async () => {
    const content = JSON.stringify({
      plugins: [
        {
          plugin: '@nx/vitest',
          options: { testTargetName: 'custom-test' },
        },
      ],
    });
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));
    await workspace.tree.write(relativePath('nx.json'), content);

    await runTransform({ workspace, transforms: [nxVitestPluginTransform] });

    expect(workspace.commands.all()).toEqual([]);
  });

  it('skips when nx.json is missing', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));

    await runTransform({ workspace, transforms: [nxVitestPluginTransform] });

    expect(workspace.commands.all()).toEqual([]);
  });
});
