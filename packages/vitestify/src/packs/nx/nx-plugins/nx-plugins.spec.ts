import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { nxPluginsTransform } from './nx-plugins.transform';

describe('nxPluginsTransform', () => {
  it('adds @nx/vitest plugin to nx.json', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));
    await workspace.tree.write(relativePath('nx.json'), '{}');

    await runTransform({ workspace, transforms: [nxPluginsTransform] });

    expect(
      await workspace.tree.maybeReadJsonFile(relativePath('nx.json')),
    ).toMatchObject({
      plugins: [
        {
          plugin: '@nx/vitest',
          options: {
            testTargetName: 'test',
            ciTargetName: 'test-ci',
            testMode: 'watch',
          },
        },
      ],
    });
  });

  it('adds @nx/vitest plugin to nx.json when plugins is not empty', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));
    await workspace.tree.write(
      relativePath('nx.json'),
      JSON.stringify({
        plugins: [{ plugin: '@nx/js/typescript' }],
      }),
    );

    await runTransform({ workspace, transforms: [nxPluginsTransform] });

    expect(
      await workspace.tree.maybeReadJsonFile(relativePath('nx.json')),
    ).toMatchObject({
      plugins: [
        { plugin: '@nx/js/typescript' },
        {
          plugin: '@nx/vitest',
          options: {
            testTargetName: 'test',
            ciTargetName: 'test-ci',
            testMode: 'watch',
          },
        },
      ],
    });
  });

  it('queues nx add @nx/vitest when @nx/plugin is not configured', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));
    await workspace.tree.write(relativePath('nx.json'), '{}');

    await runTransform({ workspace, transforms: [nxPluginsTransform] });

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

    await runTransform({ workspace, transforms: [nxPluginsTransform] });

    expect(workspace.commands.all()).toEqual([]);
  });

  it('skips when nx.json is missing', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));

    await runTransform({ workspace, transforms: [nxPluginsTransform] });

    expect(workspace.commands.all()).toEqual([]);
  });

  it.todo(
    'normalizes a string plugin entry to an object with jest test targets',
    () => {
      // arrange nx.json with plugins: ['@nx/jest/plugin']
      // run nxPluginsTransform
      // assert plugins is [{ plugin: '@nx/jest/plugin', options: { targetName: 'jest', ... } }]
    },
  );

  it.todo(
    'normalizes an object plugin entry without options to jest test targets',
    () => {
      // arrange nx.json with plugins: [{ plugin: '@nx/jest/plugin' }]
      // run nxPluginsTransform
      // assert plugins is [{ plugin: '@nx/jest/plugin', options: { targetName: 'jest', ... } }]
    },
  );

  it.todo(
    'updates an object plugin entry with options so test targets become jest',
    () => {
      // arrange nx.json with plugins: [{ plugin: '@nx/jest/plugin', options: { targetName: 'test', serveTargetName: 'serve' } }]
      // run nxPluginsTransform
      // assert targetName is 'jest' and other options are preserved
    },
  );
});
