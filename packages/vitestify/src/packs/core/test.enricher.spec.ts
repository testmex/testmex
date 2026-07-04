import { describe, expect, it } from 'vitest';
import { Tree } from '../../core/domain/tree';
import {
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../core/models/workspace.mother';
import { WorkspaceInfo } from '../../core/models/workspace-info';
import { FileSystemFake } from '../../core/ports/file-system.fake';
import { TestEnricher } from './test.enricher';

describe(TestEnricher.name, () => {
  it('ignores non test files', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content: 'export const app = 1;',
        fileName: 'src/app.ts',
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([]);
  });

  it('discovers .spec.ts files and tags them as test', async () => {
    const mother = WorkspaceMother.withApp('my-app')
      .withFile(
        WorkspaceFileMother.testFile({
          appName: 'my-app',
          content: 'it("works", () => {})',
          fileName: 'src/app.spec.ts',
        }).build(),
      )
      .withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'export const app = 1;',
          fileName: 'src/app.ts',
        }).build(),
      );

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
      },
    ]);
  });

  it('discovers .spec.tsx files and tags them as test', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.testFile({
        appName: 'my-app',
        content: 'it("works", () => {})',
        fileName: 'src/app.spec.tsx',
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.spec.tsx',
        tags: ['test'],
      },
    ]);
  });

  it('discovers .snap files and tags them as snapshot', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.snapshotFile({
        appName: 'my-app',
        fileName: 'app.spec.tsx.snap',
        content: "exports[`foo test 1`] = `Array ['foo', 'bar']`;",
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/__snapshots__/app.spec.tsx.snap',
        tags: ['snapshot'],
      },
    ]);
  });
});

async function enrich(mother: WorkspaceMother) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  const enricher = new TestEnricher({ tree: new Tree({ fileSystem }) });
  const workspaceInfo = mother.buildWorkspaceInfo();
  const result = await enricher.enrich(
    new WorkspaceInfo({
      files: [],
      projects: workspaceInfo.projects,
    }),
  );

  return result.getProjectFiles('my-app');
}
