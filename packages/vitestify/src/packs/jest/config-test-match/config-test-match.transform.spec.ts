import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { fileTags } from '../../core/identifiers';
import { configTestMatchTransform } from './config-test-match.transform';

describe(configTestMatchTransform.name, () => {
  it.todo('add "testMatch" to match ".jest.cts" and ".jest.tsx"', async () => {
    const transformed = await transformJestConfig(`
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
`);
    expect(transformed).toContain(`\
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testMatch: ["**/.*\\\\.jest\\\\.(cts|tsx)"],
};
`);
  });

  it.todo('overwrite existing "testMatch"', () => {
    // transform jest config with testMatch: ["**/.*\\.spec\\.(ts|tsx)"]
    // assert testMatch was replaced with ["**/.*\\.jest\\.(cts|tsx)"]
  });
});

async function transformJestConfig(content: string) {
  const appName = 'my-app';
  const jestConfigName = 'jest.config.ts';
  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.file({
        appName,
        content,
        fileName: jestConfigName,
        tags: [fileTags.jestConfig],
      }).build(),
    ),
  );
  await runTransform({
    workspace,
    transforms: [configTestMatchTransform],
  });
  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/${jestConfigName}`),
  );
}
