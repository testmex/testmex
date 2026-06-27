import { describe, expect, it } from 'vitest';
import type { Tree } from '../../../core/domain/tree';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { jestRenameTestFilesTransform } from './jest-rename-test-files.transform';

describe(jestRenameTestFilesTransform.name, () => {
  it('renames .spec.ts to .jest.ts', async () => {
    const content = 'it("works", () => {})';
    const appName = 'my-app';
    const tree = await runRenameTransform(
      WorkspaceMother.withApp(appName).withFile(
        WorkspaceFileMother.testFile({
          appName,
          content,
          fileName: 'src/app.spec.ts',
        }).build(),
      ),
    );

    expect
      .soft(
        await tree.maybeReadFile(
          relativePath(`apps/${appName}/src/app.jest.ts`),
        ),
      )
      .toBe(content);
    expect
      .soft(
        await tree.maybeReadFile(
          relativePath(`apps/${appName}/src/app.spec.ts`),
        ),
      )
      .toBeNull();
  });

  it('renames .test.ts to .jest.ts', async () => {
    const content = 'it("works", () => {})';
    const appName = 'my-app';
    const tree = await runRenameTransform(
      WorkspaceMother.withApp(appName).withFile(
        WorkspaceFileMother.testFile({
          appName,
          content,
          fileName: 'src/app.test.ts',
        }).build(),
      ),
    );

    expect
      .soft(
        await tree.maybeReadFile(
          relativePath(`apps/${appName}/src/app.jest.ts`),
        ),
      )
      .toBe(content);
    expect
      .soft(
        await tree.maybeReadFile(
          relativePath(`apps/${appName}/src/app.test.ts`),
        ),
      )
      .toBeNull();
  });

  it('skips files that are not .spec.ts or .test.ts', async () => {
    const content = 'export const app = 1;';
    const appName = 'my-app';
    const tree = await runRenameTransform(
      WorkspaceMother.withApp(appName).withFile(
        WorkspaceFileMother.file({
          appName,
          content,
          fileName: 'src/app.ts',
        }).build(),
      ),
    );

    expect(
      await tree.maybeReadFile(relativePath(`apps/${appName}/src/app.ts`)),
    ).toBe(content);
  });
});

async function runRenameTransform(mother: WorkspaceMother): Promise<Tree> {
  const workspace = createTestingWorkspace(mother);

  await runTransform({
    workspace,
    transforms: [jestRenameTestFilesTransform],
  });

  return workspace.tree;
}
