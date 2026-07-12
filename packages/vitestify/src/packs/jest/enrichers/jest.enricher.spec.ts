import { describe, expect, it } from 'vitest';
import { Tree } from '../../../core/domain/tree';
import { Workspace } from '../../../core/domain/workspace';
import {
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { FileSystemFake } from '../../../core/ports/file-system.fake';
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

  it('tags setup file referenced in setupFilesAfterEnv when it exists', async () => {
    const mother = WorkspaceMother.withApp('my-app')
      .withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `export default {
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};`,
          fileName: 'jest.config.ts',
        }).build(),
      )
      .withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'import "@testing-library/jest-dom";',
          fileName: 'src/test-setup.ts',
        }).build(),
      );

    const result = await enrich(mother);

    expect(result.fileInfos).toContainEqual({
      path: 'apps/my-app/src/test-setup.ts',
      tags: ['jest-setup'],
    });
  });

  it('tags setup file referenced in setupFiles when it exists', async () => {
    const mother = WorkspaceMother.withApp('my-app')
      .withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `export default {
  setupFiles: ['<rootDir>/src/test-setup.ts'],
};`,
          fileName: 'jest.config.ts',
        }).build(),
      )
      .withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'import "@testing-library/jest-dom";',
          fileName: 'src/test-setup.ts',
        }).build(),
      );

    const result = await enrich(mother);

    expect(result.fileInfos).toContainEqual({
      path: 'apps/my-app/src/test-setup.ts',
      tags: ['jest-setup'],
    });
  });

  it('does not tag a file that is not referenced in jest config', async () => {
    const mother = WorkspaceMother.withApp('my-app')
      .withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'export default {};',
          fileName: 'jest.config.ts',
        }).build(),
      )
      .withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'import "@testing-library/jest-dom";',
          fileName: 'src/test-setup.ts',
        }).build(),
      );

    const result = await enrich(mother);

    expect(result.fileInfos).not.toContainEqual({
      path: 'apps/my-app/src/test-setup.ts',
      tags: ['jest-setup'],
    });
  });
});

async function enrich(mother: WorkspaceMother) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  const tree = new Tree({ fileSystem });
  const enricher = new JestEnricher();

  return enricher.enrich({
    workspace: new Workspace({
      state: mother.buildWorkspaceState(),
      tree,
    }),
  });
}
