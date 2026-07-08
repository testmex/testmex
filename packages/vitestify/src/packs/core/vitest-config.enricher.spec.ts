import { describe, expect, it } from 'vitest';
import { Tree } from '../../core/domain/tree';
import { Workspace } from '../../core/domain/workspace';
import {
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../core/models/workspace.mother';
import { FileSystemFake } from '../../core/ports/file-system.fake';
import { VitestConfigEnricher } from './vitest-config.enricher';

describe(VitestConfigEnricher, () => {
  it('discovers vitest.config.mts and tags it as vitest-config', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content: 'export default {}',
        fileName: 'vitest.config.mts',
      }).build(),
    );

    const result = await enrich(mother);

    expect(result.fileInfos).toEqual([
      {
        path: 'apps/my-app/vitest.config.mts',
        tags: ['vitest-config'],
      },
    ]);
  });

  it('discovers vitest.config.ts and tags it as vitest-config', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content: 'export default {}',
        fileName: 'vitest.config.ts',
      }).build(),
    );

    const result = await enrich(mother);

    expect(result.fileInfos).toEqual([
      {
        path: 'apps/my-app/vitest.config.ts',
        tags: ['vitest-config'],
      },
    ]);
  });
});

async function enrich(mother: WorkspaceMother) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  const tree = new Tree({ fileSystem });
  const enricher = new VitestConfigEnricher();

  return enricher.enrich(
    new Workspace({
      info: mother.buildWorkspaceInfo(),
      tree,
    }),
  );
}
