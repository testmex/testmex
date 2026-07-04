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
    const { nxJson } = await transformNxJson({});

    expect(nxJson).toMatchObject({
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
    const { nxJson } = await transformNxJson({
      plugins: [{ plugin: '@nx/js/typescript' }],
    });

    expect(nxJson).toMatchObject({
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
    const { commands } = await transformNxJson({});

    expect(commands).toEqual([['npx', 'nx', 'add', '@nx/vitest']]);
  });

  it('skips when @nx/vitest plugin already present', async () => {
    const { commands } = await transformNxJson({
      plugins: [
        {
          plugin: '@nx/vitest',
          options: { testTargetName: 'custom-test' },
        },
      ],
    });

    expect(commands).toEqual([]);
  });

  it('skips when nx.json is missing', async () => {
    const { commands } = await transformNxJson();

    expect(commands).toEqual([]);
  });

  it('normalizes a string plugin entry to an object with jest test targets', async () => {
    const { nxJson } = await transformNxJson({
      plugins: ['@nx/jest/plugin'],
    });

    expect(nxJson?.plugins).toContainEqual({
      plugin: '@nx/jest/plugin',
      options: { targetName: 'jest' },
    });
  });

  it('normalizes an object plugin entry without options to jest test targets', async () => {
    const { nxJson } = await transformNxJson({
      plugins: [{ plugin: '@nx/jest/plugin' }],
    });

    expect(nxJson?.plugins).toContainEqual({
      plugin: '@nx/jest/plugin',
      options: { targetName: 'jest' },
    });
  });

  it('updates an object plugin entry with options so test targets become jest', async () => {
    const { nxJson } = await transformNxJson({
      plugins: [
        {
          plugin: '@nx/jest/plugin',
          options: { targetName: 'test', serveTargetName: 'serve' },
        },
      ],
    });

    expect(nxJson?.plugins).toContainEqual({
      plugin: '@nx/jest/plugin',
      options: { targetName: 'jest', serveTargetName: 'serve' },
    });
  });
});

async function transformNxJson(content?: NxJson) {
  const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));

  if (content !== undefined) {
    await workspace.tree.write(
      relativePath('nx.json'),
      JSON.stringify(content),
    );
  }

  await runTransform({ workspace, transforms: [nxPluginsTransform] });

  return {
    nxJson: await workspace.tree.maybeReadJsonFile<NxJson>(
      relativePath('nx.json'),
    ),
    commands: workspace.commands.all(),
  };
}

interface NxJson {
  plugins?: unknown[];
}
