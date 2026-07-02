import { describe, it } from 'vitest';

describe('nxPluginJestTargetTransform', () => {
  it.todo(
    'normalizes a string plugin entry to an object with jest test targets',
    () => {
      // arrange nx.json with plugins: ['@nx/jest/plugin']
      // run nxPluginJestTargetTransform
      // assert plugins is [{ plugin: '@nx/jest/plugin', options: { targetName: 'jest', ... } }]
    },
  );

  it.todo(
    'normalizes an object plugin entry without options to jest test targets',
    () => {
      // arrange nx.json with plugins: [{ plugin: '@nx/jest/plugin' }]
      // run nxPluginJestTargetTransform
      // assert plugins is [{ plugin: '@nx/jest/plugin', options: { targetName: 'jest', ... } }]
    },
  );

  it.todo(
    'updates an object plugin entry with options so test targets become jest',
    () => {
      // arrange nx.json with plugins: [{ plugin: '@nx/jest/plugin', options: { targetName: 'test', serveTargetName: 'serve' } }]
      // run nxPluginJestTargetTransform
      // assert targetName is 'jest' and other options are preserved
    },
  );
});
