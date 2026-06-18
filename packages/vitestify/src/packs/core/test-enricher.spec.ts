import { describe, expect, it } from 'vitest';
import { Tree } from '../../core/domain/tree';
import { workspaceMother } from '../../core/models/workspace.mother';
import { FileSystemFake } from '../../core/ports/file-system.fake';
import { TestEnricher } from './test-enricher';

type Mother = ReturnType<typeof workspaceMother.withApp>;

describe(TestEnricher.name, () => {
  it('ignores non test files', async () => {
    const mother = workspaceMother
      .withApp('my-app')
      .withAppFile('my-app', 'src/app.ts', 'export const app = 1;');

    const files = await enrich(mother);

    expect(files).toEqual([]);
  });

  it('discovers .spec.ts files and tags them as test', async () => {
    const mother = workspaceMother
      .withApp('my-app')
      .withAppFile('my-app', 'src/app.spec.ts', 'it("works", () => {})')
      .withAppFile('my-app', 'src/app.ts', 'export const app = 1;');

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
      },
    ]);
  });

  it('discovers .spec.tsx files and tags them as test', async () => {
    const mother = workspaceMother
      .withApp('my-app')
      .withAppFile('my-app', 'src/app.spec.tsx', 'it("works", () => {})');

    const files = await enrich(mother);

    expect(files).toEqual([
      {
        path: 'apps/my-app/src/app.spec.tsx',
        tags: ['test'],
      },
    ]);
  });
});

async function enrich(mother: Mother) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  const enricher = new TestEnricher({ tree: new Tree({ fileSystem }) });
  const { projects } = mother.buildWorkspaceInfo();
  const result = await enricher.enrich({
    projects: projects.map((project) => ({ ...project, files: [] })),
  });

  return result.projects[0].files;
}
