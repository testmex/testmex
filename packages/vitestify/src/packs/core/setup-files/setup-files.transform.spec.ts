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
  it.todo('clones jest setup file with vitest- prefix', async () => {
    const appName = 'my-app';
    const setupContent = `import '@testing-library/jest-dom';`;

    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp(appName).withFile(
        WorkspaceFileMother.file({
          appName,
          content: setupContent,
          fileName: relativePath(`apps/${appName}/test.setup.ts`),
          tags: [fileTags.jestSetup],
        }).build(),
      ),
    );

    await runTransform({
      workspace,
      transforms: [setupFilesTransform],
    });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath(`apps/${appName}/vitest-test.setup.ts`),
      ),
    ).toBe(`import '@testing-library/jest-dom';`);
  });

  it.todo('does not overwrite existing vitest- prefixed clone', async () => {
    const appName = 'my-app';
    const setupContent = `import '@testing-library/jest-dom';`;
    const existingCloneContent = `import '@testing-library/jest-dom/vitest';`;

    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp(appName)
        .withFile(
          WorkspaceFileMother.file({
            appName,
            content: setupContent,
            fileName: relativePath(`apps/${appName}/test.setup.ts`),
            tags: [fileTags.jestSetup],
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName,
            content: existingCloneContent,
            fileName: relativePath(`apps/${appName}/vitest-test.setup.ts`),
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
    ).toBe(`import '@testing-library/jest-dom/vitest';`);
  });
});
