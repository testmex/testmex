import { describe, expect, it } from 'vitest';
import { Tree } from '../../core/domain/tree';
import { Workspace } from '../../core/domain/workspace';
import {
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../core/models/workspace.mother';
import { FileSystemFake } from '../../core/ports/file-system.fake';
import { JestEnricher } from './jest.enricher';

describe(JestEnricher.name, () => {
  it('discovers .jest.cts files and tags them as test', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.testFile({
        appName: 'my-app',
        content: 'it("works", () => {})',
        fileName: 'src/app.jest.cts',
      }).build(),
    );

    const result = await enrich(mother);

    expect(result.fileInfos).toEqual([
      {
        path: 'apps/my-app/src/app.jest.cts',
        tags: ['test'],
      },
    ]);
  });

  it('discovers .jest.tsx files and tags them as test', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.testFile({
        appName: 'my-app',
        content: 'it("works", () => {})',
        fileName: 'src/app.jest.tsx',
      }).build(),
    );

    const result = await enrich(mother);

    expect(result.fileInfos).toEqual([
      {
        path: 'apps/my-app/src/app.jest.tsx',
        tags: ['test'],
      },
    ]);
  });
});

async function enrich(mother: WorkspaceMother) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  const tree = new Tree({ fileSystem });
  const enricher = new JestEnricher();

  return enricher.enrich(
    new Workspace({
      info: mother.buildWorkspaceInfo(),
      tree,
    }),
  );
}
