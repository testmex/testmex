import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../../core/models/workspace.mother';
import { runTransform } from '../../../../../testing/run-transform';
import { jestSymbolHeuristic } from '../../../heuristics/jest-symbol/jest-symbol.heuristic';
import { renameJestToSpecTransform } from './rename-jest-to-spec.transform';

describe(renameJestToSpecTransform.name, () => {
  it('renames jest tests ending in .jest.cts to .spec.ts', async () => {
    const fileName = 'src/app.jest.cts';
    const { workspace } = await runRenameJestToSpec({
      content: 'jest.spyOn(service, "method");',
      fileName,
    });

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/app.spec.ts'),
        ),
      )
      .toBe('jest.spyOn(service, "method");');
    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/app.jest.cts'),
        ),
      )
      .toBeNull();
    expect.soft(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
      },
    ]);
    expect.soft(workspace.findings).toMatchObject([
      {
        filePath: 'apps/my-app/src/app.spec.ts',
      },
    ]);
  });

  it('renames jest tests ending in .jest.tsx to .spec.tsx', async () => {
    const fileName = 'src/app.jest.tsx';
    const { workspace } = await runRenameJestToSpec({
      content: 'jest.spyOn(service, "method");',
      fileName,
    });

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/app.spec.tsx'),
        ),
      )
      .toBe('jest.spyOn(service, "method");');
    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/app.jest.tsx'),
        ),
      )
      .toBeNull();
    expect.soft(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app.spec.tsx',
        tags: ['test'],
      },
    ]);
  });

  it('skips files that are not jest tests', async () => {
    const fileName = 'src/app.jest.cts';
    const { workspace } = await runRenameJestToSpec({
      content: 'it("works", () => {});',
      fileName,
    });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/src/app.jest.cts'),
      ),
    ).toBe('it("works", () => {});');
  });
});

async function runRenameJestToSpec({
  content,
  fileName,
}: {
  content: string;
  fileName: string;
}) {
  const appName = 'my-app';
  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.testFile({
        appName,
        content,
        fileName,
      }).build(),
    ),
  );

  await runTransform({
    workspace,
    heuristics: [jestSymbolHeuristic],
    transforms: [renameJestToSpecTransform],
  });

  return { workspace };
}
