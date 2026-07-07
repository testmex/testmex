import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { jestSymbolHeuristic } from '../jest-symbol.heuristic';
import { jestRenameTestFilesTransform } from './jest-rename-test-files.transform';

describe(jestRenameTestFilesTransform.name, () => {
  it('renames jest tests ending in .spec.ts to .jest.cts', async () => {
    const fileName = 'src/app.spec.ts';
    const { tree } = await runJestRenameTestFile({
      content: 'jest.spyOn(service, "method");',
      fileName,
    });

    expect
      .soft(
        await tree.maybeReadFile(relativePath('apps/my-app/src/app.jest.cts')),
      )
      .toBe('jest.spyOn(service, "method");');
    expect
      .soft(
        await tree.maybeReadFile(relativePath('apps/my-app/src/app.spec.ts')),
      )
      .toBeNull();
    expect.soft(tree.getFiles()).toEqual([
      {
        path: 'apps/my-app/src/app.jest.cts',
        tags: ['test'],
      },
    ]);
  });

  it('renames jest tests ending in .spec.tsx to .jest.tsx', async () => {
    const fileName = 'src/app.spec.tsx';
    const { tree } = await runJestRenameTestFile({
      content: 'jest.spyOn(service, "method");',
      fileName,
    });

    expect
      .soft(
        await tree.maybeReadFile(relativePath(`apps/my-app/src/app.jest.tsx`)),
      )
      .toBe('jest.spyOn(service, "method");');
    expect
      .soft(
        await tree.maybeReadFile(relativePath('apps/my-app/src/app.spec.tsx')),
      )
      .toBeNull();
    expect.soft(tree.getFiles()).toEqual([
      {
        path: 'apps/my-app/src/app.jest.tsx',
        tags: ['test'],
      },
    ]);
  });

  it('skips files that are not jest tests', async () => {
    const fileName = 'src/app.spec.ts';
    const { tree } = await runJestRenameTestFile({
      content: 'it("works", () => {});',
      fileName,
    });

    expect(
      await tree.maybeReadFile(relativePath('apps/my-app/src/app.spec.ts')),
    ).toBe('it("works", () => {});');
  });
});

async function runJestRenameTestFile({
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
    transforms: [jestRenameTestFilesTransform],
  });

  return { tree: workspace.tree };
}
