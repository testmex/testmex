import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { runTransform } from '../../../../testing/run-transform';
import { jestSymbolHeuristic } from '../../heuristics/jest-symbol/jest-symbol.heuristic';
import { renameSpecToJestTransform } from './rename-spec-to-jest.transform';

describe(renameSpecToJestTransform.name, () => {
  it('renames jest tests ending in .spec.ts to .jest.cts', async () => {
    const fileName = 'src/app.spec.ts';
    const { workspace } = await runRenameSpecToJest({
      content: 'jest.spyOn(service, "method");',
      fileName,
    });

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/app.jest.cts'),
        ),
      )
      .toBe('jest.spyOn(service, "method");');
    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/app.spec.ts'),
        ),
      )
      .toBeNull();
    expect.soft(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app.jest.cts',
        tags: ['test'],
      },
    ]);
    expect.soft(workspace.findings).toMatchObject([
      {
        filePath: 'apps/my-app/src/app.jest.cts',
      },
    ]);
  });

  it('renames jest tests ending in .spec.tsx to .jest.tsx', async () => {
    const fileName = 'src/app.spec.tsx';
    const { workspace } = await runRenameSpecToJest({
      content: 'jest.spyOn(service, "method");',
      fileName,
    });

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath(`apps/my-app/src/app.jest.tsx`),
        ),
      )
      .toBe('jest.spyOn(service, "method");');
    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/app.spec.tsx'),
        ),
      )
      .toBeNull();
    expect.soft(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app.jest.tsx',
        tags: ['test'],
      },
    ]);
  });

  it('skips files that are not jest tests', async () => {
    const fileName = 'src/app.spec.ts';
    const { workspace } = await runRenameSpecToJest({
      content: 'it("works", () => {});',
      fileName,
    });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/src/app.spec.ts'),
      ),
    ).toBe('it("works", () => {});');
  });
});

async function runRenameSpecToJest({
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
    transforms: [renameSpecToJestTransform],
  });

  return { workspace };
}
