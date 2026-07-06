import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { fileTags } from '../../core/identifiers';
import { configTestPathPatternsTransform } from './config-test-path-patterns.transform';

describe(configTestPathPatternsTransform.name, () => {
  it('add "testPathPatterns" to match ".jest.cts"', async () => {
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
  testPathPatterns: ["**/.*\\\\.jest\\\\.(cts|tsx)"],
};
`);
  });

  it('transform ".spec.ts" to ".jest.cts" in "testPathPatterns"', async () => {
    const transformed = await transformJestConfig(`
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathPatterns: ["**/.*\\\\.spec\\\\.(ts|tsx)"],
};
    `);
    expect(transformed).toContain(`\
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathPatterns: ["**/.*\\\\.jest\\\\.(cts|tsx)"],
};
    `);
  });

  it('transform ".test.ts" to ".jest.cts" in "testPathPatterns"', async () => {
    const transformed = await transformJestConfig(`
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathPatterns: ["**/.*\\\\.test\\\\.(ts|tsx)"],
};
    `);
    expect(transformed).toContain(
      `testPathPatterns: ["**/.*\\\\.jest\\\\.(cts|tsx)"]`,
    );
  });

  it('transform ".(spec|test).ts" to ".jest.cts" in "testPathPatterns"', async () => {
    const transformed = await transformJestConfig(`
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathPatterns: ["**/.*\\\\.(spec|test)\\\\.(ts|tsx)"],
};
    `);
    expect(transformed).toContain(
      `testPathPatterns: ["**/.*\\\\.(jest)\\\\.(cts|tsx)"]`,
    );
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
    transforms: [configTestPathPatternsTransform],
  });
  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/${jestConfigName}`),
  );
}
