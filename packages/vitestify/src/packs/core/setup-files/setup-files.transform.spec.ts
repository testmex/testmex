import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { fileTags } from '../identifiers';
import { setupFilesTransform } from './setup-files.transform';

describe('setup-files', () => {
  it('clones jest setup file with vitest- prefix', async () => {
    const appName = 'my-app';
    const setupContent = `import '@testing-library/jest-dom';`;

    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp(appName).withFile(
        WorkspaceFileMother.file({
          appName,
          content: setupContent,
          fileName: 'test.setup.ts',
          tags: [fileTags.jestSetup],
        }).build(),
      ),
    );

    await runTransform({
      workspace,
      transforms: [setupFilesTransform],
    });

    expect(workspace.getFiles()).toContainEqual({
      path: 'apps/my-app/vitest-test.setup.ts',
      projects: [
        {
          name: 'my-app',
          path: 'apps/my-app',
        },
      ],
      tags: ['code'],
    });
  });

  it('does not overwrite existing vitest- prefixed clone', async () => {
    const appName = 'my-app';

    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp(appName)
        .withFile(
          WorkspaceFileMother.file({
            appName,
            content: `import '@testing-library/jest-dom';`,
            fileName: 'test.setup.ts',
            tags: [fileTags.jestSetup],
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName,
            content: `console.log('initial config')`,
            fileName: 'vitest-test.setup.ts',
          }).build(),
        ),
    );

    await runTransform({
      workspace,
      transforms: [setupFilesTransform],
    });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath(`apps/my-app/vitest-test.setup.ts`),
      ),
    ).toBe(`console.log('initial config')`);
  });
});
