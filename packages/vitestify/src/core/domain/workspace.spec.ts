import { describe, expect, it } from 'vitest';
import { Tree } from './tree';
import { Workspace } from './workspace';
import { relativePath, type RelativePath } from '../models/relative-path';
import { FileSystemFake } from '../ports/file-system.fake';
import { fileTag, type FileTag } from '../domain/workspace';
import { WorkspaceState } from '../models/workspace-state';

describe(Workspace, () => {
  it('asReadonly() exposes getFilesWithProjects', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('apps/my-app/src/app.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      },
    );

    expect(workspace.asReadonly().files).toMatchObject([
      {
        path: 'apps/my-app/src/app.ts',
        projects: [{ name: 'my-app', path: 'apps/my-app' }],
      },
    ]);
  });

  it('rename() moves file in filesystem', async () => {
    const fileSystem = new FileSystemFake();
    const originalPath = relativePath('apps/my-app/src/app.spec.ts');
    const newPath = relativePath('apps/my-app/src/app.jest.cts');
    const workspace = new Workspace({
      tree: new Tree({ fileSystem }),
    });

    fileSystem.configure({
      [originalPath]: 'it("works", () => {});',
    });

    await workspace.rename(originalPath, newPath);

    await workspace.tree.commit();

    expect(await fileSystem.maybeReadFile(newPath)).toBe(
      `it("works", () => {});`,
    );
  });

  it('delete() removes file in filesystem', async () => {
    const fileSystem = new FileSystemFake();
    const path = relativePath('apps/my-app/main.ts');
    const workspace = new Workspace({
      tree: new Tree({ fileSystem }),
    });

    fileSystem.configure({
      [path]: 'console.log("hello");',
    });

    workspace.tag(path, fileTag('code'));

    workspace.delete(path);

    await workspace.tree.commit();

    expect(await fileSystem.maybeReadFile(path)).toBeNull();
  });
});

function workspaceWithFiles(
  files: { path: RelativePath; tags?: FileTag[] }[],
  info: ConstructorParameters<typeof WorkspaceState>[0] = {},
): Workspace {
  const workspace = new Workspace({
    info: new WorkspaceState(info),
    tree: new Tree({ fileSystem: new FileSystemFake() }),
  });

  for (const file of files) {
    const tags = file.tags ?? [fileTag('tracked')];

    for (const tag of tags) {
      workspace.tag(file.path, tag);
    }
  }

  return workspace;
}
