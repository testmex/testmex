import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { jestConfigTestPathPatterns } from './jest-config-test-path-patterns.transform';

describe('jest-config-test-path-patterns', () => {
  it.todo('add "testPathPatterns" to match ".jest.ts"', async () => {
    const transformed = await transformJestConfig(`
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
`);
    expect(transformed).toBe(`
module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathPatterns: ["**/.*\\.jest\\.(ts|tsx)"]
};
`);
  });

  it.todo(
    'transform ".spec.ts" and ".test.ts" to ".jest.ts" in "testPathPatterns"',
    () => {
      throw new Error('🚧 Work in progress!');
    },
  );

  it.todo(
    'transform ".spec.ts" and ".test.ts" to ".jest.ts" in "testPathIgnorePatterns"',
    () => {
      throw new Error('🚧 Work in progress!');
    },
  );
});

async function transformJestConfig(content: string) {
  const appName = 'my-app';
  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.file({
        appName,
        content,
        fileName: 'jest.config.ts',
      }).build(),
    ),
  );
  await runTransform({ workspace, transforms: [jestConfigTestPathPatterns] });
  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/jest.config.ts`),
  );
}
