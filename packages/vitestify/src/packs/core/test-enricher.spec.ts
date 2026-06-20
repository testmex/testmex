import { describe, expect, it } from 'vitest';
import { Tree } from '../../core/domain/tree';
import { WorkspaceMother } from '../../core/models/workspace.mother';
import { FileSystemFake } from '../../core/ports/file-system.fake';
import { TestEnricher } from './test-enricher';

describe(TestEnricher.name, () => {
  it('ignores non test files', async () => {
    const mother = WorkspaceMother.withApp('my-app').withLegacyFile({
      appName: 'my-app',
      fileName: 'src/app.ts',
      content: 'export const app = 1;',
    });

    const files = await enrich(mother);

    expect(files).toEqual([]);
  });

  it('discovers .spec.ts files and tags them as test', async () => {
    const mother = WorkspaceMother.withApp('my-app')
      .withLegacyFile({
        appName: 'my-app',
        fileName: 'src/app.spec.ts',
        content: 'it("works", () => {})',
      })
      .withLegacyFile({
        appName: 'my-app',
        fileName: 'src/app.ts',
        content: 'export const app = 1;',
      });

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
      },
    ]);
  });

  it('discovers .spec.tsx files and tags them as test', async () => {
    const mother = WorkspaceMother.withApp('my-app').withLegacyFile({
      appName: 'my-app',
      fileName: 'src/app.spec.tsx',
      content: 'it("works", () => {})',
    });

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.spec.tsx',
        tags: ['test'],
      },
    ]);
  });

  it('discovers .snap files and tags them as snapshot', async () => {
    const mother = WorkspaceMother.withApp('my-app').withLegacyFile({
      appName: 'my-app',
      fileName: '__snapshots__/app.spec.tsx.snap',
      content: "exports[`foo test 1`] = `Array ['foo', 'bar']`;",
    });

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
  const { projects } = mother.buildWorkspaceInfo();
  const result = await enricher.enrich({
    projects: projects.map((project) => ({ ...project, files: [] })),
  });

  return result.projects[0].files;
}
