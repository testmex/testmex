import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { runTransform } from '../../../../testing/run-transform';
import { fileTags } from '../../identifiers';
import { tsconfigTransform } from './tsconfig.transform';

describe('tsconfig', () => {
  it('replaces module commonjs with preserve in tsconfig.spec.json', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app')
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'jest.config.ts',
            tags: [fileTags.jestConfig],
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'vitest.config.mts',
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: JSON.stringify(
              {
                extends: './tsconfig.json',
                compilerOptions: {
                  module: 'commonjs',
                  types: ['jest', 'node'],
                },
              },
              null,
              2,
            ),
            fileName: 'tsconfig.spec.json',
          }).build(),
        ),
    );

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadJsonFile(
        relativePath('apps/my-app/tsconfig.spec.json'),
      ),
    ).toMatchObject({
      compilerOptions: {
        module: 'preserve',
        types: ['jest', 'node'],
      },
    });
  });

  it('sets module to preserve when module is not set', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app')
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'jest.config.ts',
            tags: [fileTags.jestConfig],
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'vitest.config.mts',
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: JSON.stringify(
              {
                extends: './tsconfig.json',
                compilerOptions: {
                  types: ['jest', 'node'],
                },
              },
              null,
              2,
            ),
            fileName: 'tsconfig.spec.json',
          }).build(),
        ),
    );

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadJsonFile(
        relativePath('apps/my-app/tsconfig.spec.json'),
      ),
    ).toMatchObject({
      compilerOptions: {
        module: 'preserve',
        types: ['jest', 'node'],
      },
    });
  });

  it('skips when module is not commonjs', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app')
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'jest.config.ts',
            tags: [fileTags.jestConfig],
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'vitest.config.mts',
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: JSON.stringify(
              {
                compilerOptions: {
                  module: 'preserve',
                },
              },
              null,
              2,
            ),
            fileName: 'tsconfig.spec.json',
          }).build(),
        ),
    );

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadJsonFile(
        relativePath('apps/my-app/tsconfig.spec.json'),
      ),
    ).toMatchObject({
      compilerOptions: {
        module: 'preserve',
      },
    });
  });
});

async function transform(workspace: ReturnType<typeof createTestingWorkspace>) {
  await runTransform({
    workspace,
    transforms: [tsconfigTransform],
  });
}
