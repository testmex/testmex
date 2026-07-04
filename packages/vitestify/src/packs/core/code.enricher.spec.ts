import { describe, expect, it } from 'vitest';
import { Tree } from '../../core/domain/tree';
import {
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../core/models/workspace.mother';
import { WorkspaceInfo } from '../../core/models/workspace-info';
import { FileSystemFake } from '../../core/ports/file-system.fake';
import { CodeEnricher } from './code.enricher';

describe(CodeEnricher.name, () => {
  it('discovers .ts files and tags them as code', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content: 'export const app = 1;',
        fileName: 'src/app.ts',
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.ts',
        tags: ['code'],
      },
    ]);
  });

  it('discovers .tsx files and tags them as code', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content: 'export const App = () => null;',
        fileName: 'src/app.tsx',
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.tsx',
        tags: ['code'],
      },
    ]);
  });

  it('ignores test files', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.testFile({
        appName: 'my-app',
        content: 'it("works", () => {})',
        fileName: 'src/app.spec.ts',
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([]);
  });

  it('ignores .d.ts files', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content: 'export declare const app: number;',
        fileName: 'src/app.d.ts',
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([]);
  });

  it('ignores jest.config.ts', async () => {
    const mother = WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content: 'export default {}',
        fileName: 'jest.config.ts',
      }).build(),
    );

    const files = await enrich(mother);

    expect(files).toEqual([]);
  });
});

async function enrich(mother: WorkspaceMother) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  const enricher = new CodeEnricher({ tree: new Tree({ fileSystem }) });
  const workspaceInfo = mother.buildWorkspaceInfo();
  const result = await enricher.enrich(
    new WorkspaceInfo({
      files: [],
      projects: workspaceInfo.projects,
    }),
  );

  return result.getProjectFiles('my-app');
}
