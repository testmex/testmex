import { describe, expect, it } from 'vitest';
import { Tree } from './tree';
import { Workspace } from './workspace';
import { relativePath, type RelativePath } from '../models/relative-path';
import { FileSystemFake } from '../ports/file-system.fake';
import { fileTag, type FileTag } from '../domain/workspace';
import { WorkspaceInfo } from '../models/workspace-info';
import { findingType } from '../models/finding';

describe(Workspace.name, () => {
  it('returns a file with its matching project', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('apps/my-app/src/app.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      },
    );

    expect(workspace.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.ts',
        projects: [{ name: 'my-app', path: 'apps/my-app' }],
      },
    ]);
  });

  it('returns a file even when there are no projects matching', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('libs/frontend/a/index.ts') }],
      { projects: [] },
    );

    expect(workspace.getFiles()).toMatchObject([
      { path: 'libs/frontend/a/index.ts' },
    ]);
  });

  it('returns a file with multiple projects when it belongs to different paths', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('libs/frontend/a/index.ts') }],
      {
        projects: [
          { name: 'a', path: relativePath('libs/frontend/a') },
          { path: relativePath('libs/frontend') },
        ],
      },
    );

    expect(workspace.getFiles()).toMatchObject([
      {
        path: 'libs/frontend/a/index.ts',
        projects: [
          { name: 'a', path: 'libs/frontend/a' },
          { path: 'libs/frontend' },
        ],
      },
    ]);
  });

  it('merges projects with the same path when one has a name and one does not', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('libs/backend/jest.config.ts') }],
      {
        projects: [
          { name: 'backend', path: relativePath('libs/backend') },
          { path: relativePath('libs/backend') },
        ],
      },
    );

    expect(workspace.getFiles()).toMatchObject([
      {
        path: 'libs/backend/jest.config.ts',
        projects: [{ name: 'backend', path: 'libs/backend' }],
      },
    ]);
  });

  it('merges unnamed projects with the same path', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('libs/backend/jest.config.ts') }],
      {
        projects: [
          { path: relativePath('libs/backend') },
          { path: relativePath('libs/backend') },
        ],
      },
    );

    expect(workspace.getFiles()).toMatchObject([
      {
        path: 'libs/backend/jest.config.ts',
        projects: [{ path: 'libs/backend' }],
      },
    ]);
  });

  it('keeps projects with the same path but different names as separate projects', ({
    annotate,
  }) => {
    annotate(
      'This can happen with weird configurations where Nx and package manager resolve the same project with different names.',
    );

    const workspace = workspaceWithFiles(
      [{ path: relativePath('libs/backend/a/index.ts') }],
      {
        projects: [
          { name: 'backend-a', path: relativePath('libs/backend/a') },
          { name: '@marmicode/a', path: relativePath('libs/backend/a') },
        ],
      },
    );

    expect(workspace.getFiles()).toMatchObject([
      {
        path: 'libs/backend/a/index.ts',
        projects: [
          { name: 'backend-a', path: 'libs/backend/a' },
          { name: '@marmicode/a', path: 'libs/backend/a' },
        ],
      },
    ]);
  });

  it('returns a file with its matching root project', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('src/app.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('.') }],
      },
    );

    expect(workspace.getFiles()).toMatchObject([
      {
        path: 'src/app.ts',
        projects: [{ name: 'my-app', path: '.' }],
      },
    ]);
  });

  it('finds project files by project name', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('apps/my-app/src/app.spec.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      },
    );

    expect(workspace.getProjectFiles('my-app')).toMatchObject([
      {
        path: 'apps/my-app/src/app.spec.ts',
      },
    ]);
  });

  it('finds project files by project path', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('libs/backend/jest.config.ts') }],
      {
        projects: [{ path: relativePath('libs/backend') }],
      },
    );

    expect(workspace.getProjectFiles('libs/backend')).toMatchObject([
      {
        path: 'libs/backend/jest.config.ts',
      },
    ]);
  });

  it('finds project files by project name when project is at root', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('src/app.spec.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('.') }],
      },
    );

    expect(workspace.getProjectFiles('my-app')).toMatchObject([
      {
        path: 'src/app.spec.ts',
      },
    ]);
  });

  it('finds project files by project path when project is at root', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('src/app.spec.ts') }],
      { projects: [{ path: relativePath('.') }] },
    );

    expect(workspace.getProjectFiles('.')).toMatchObject([
      {
        path: 'src/app.spec.ts',
      },
    ]);
  });

  it('asReadonly() exposes getFilesWithProjects', () => {
    const workspace = workspaceWithFiles(
      [{ path: relativePath('apps/my-app/src/app.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      },
    );

    expect(workspace.asReadonly().getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.ts',
        projects: [{ name: 'my-app', path: 'apps/my-app' }],
      },
    ]);
  });

  it('applyEnrichment() tags files on the workspace', () => {
    const workspace = new Workspace({
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.applyEnrichment({
      fileInfos: [
        {
          path: relativePath('src/app.ts'),
          tags: [fileTag('code')],
        },
      ],
    });

    expect(workspace.getFiles()).toMatchObject([
      { path: 'src/app.ts', tags: ['code'] },
    ]);
  });

  it('tag() adds a tag retrievable via getFiles()', () => {
    const workspace = new Workspace({
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });
    const path = relativePath('apps/my-app/src/app.spec.ts');

    workspace.tag(path, fileTag('test'));

    expect(workspace.getFiles()).toEqual([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
        projects: [],
      },
    ]);
  });

  it('duplicate tag() calls are idempotent', () => {
    const workspace = new Workspace({
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });
    const path = relativePath('apps/my-app/src/app.spec.ts');
    const tag = fileTag('test');

    workspace.tag(path, tag);
    workspace.tag(path, tag);

    expect(workspace.getFiles()).toEqual([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
        projects: [],
      },
    ]);
  });

  it('rename() keeps tags', async () => {
    const fileSystem = new FileSystemFake();
    const originalPath = relativePath('apps/my-app/src/app.spec.ts');
    const newPath = relativePath('apps/my-app/src/app.jest.cts');
    const workspace = new Workspace({
      tree: new Tree({ fileSystem }),
    });

    fileSystem.configure({
      [originalPath]: 'it("works", () => {});',
    });
    workspace.tag(originalPath, fileTag('test'));

    await workspace.rename(originalPath, newPath);

    expect(workspace.getFiles()).toEqual([
      {
        path: 'apps/my-app/src/app.jest.cts',
        tags: ['test'],
        projects: [],
      },
    ]);
  });

  it('rename() updates finding paths', async () => {
    const fileSystem = new FileSystemFake();
    const originalPath = relativePath('apps/my-app/src/app.spec.ts');
    const newPath = relativePath('apps/my-app/src/app.jest.cts');
    const workspace = new Workspace({
      tree: new Tree({ fileSystem }),
    });

    fileSystem.configure({
      [originalPath]: 'it("works", () => {});',
    });
    workspace.addFindings([
      {
        type: findingType('jest-symbol'),
        projects: [],
        filePath: originalPath,
      },
    ]);

    await workspace.rename(originalPath, newPath);

    expect(workspace.findings).toEqual([
      {
        type: findingType('jest-symbol'),
        projects: [],
        filePath: 'apps/my-app/src/app.jest.cts',
      },
    ]);
  });

  it('delete() removes file from getFiles()', () => {
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

    expect(workspace.getFiles()).toEqual([]);
  });

  it('delete() removes findings', () => {
    const fileSystem = new FileSystemFake();
    const path = relativePath('apps/my-app/main.ts');
    const workspace = new Workspace({
      tree: new Tree({ fileSystem }),
    });

    fileSystem.configure({
      [path]: 'console.log("hello");',
    });
    workspace.addFindings([
      {
        type: findingType('code'),
        projects: [],
        filePath: path,
      },
    ]);

    workspace.delete(path);

    expect(workspace.findings).toEqual([]);
  });

  it('applyEnrichment() merges projects and package manager into info', () => {
    const workspace = new Workspace({
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.applyEnrichment({
      projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      packageManager: 'pnpm',
    });

    expect(workspace.info).toMatchObject({
      projects: [{ name: 'my-app', path: 'apps/my-app' }],
      packageManager: 'pnpm',
    });
  });
});

function workspaceWithFiles(
  files: { path: RelativePath; tags?: FileTag[] }[],
  info: ConstructorParameters<typeof WorkspaceInfo>[0] = {},
): Workspace {
  const workspace = new Workspace({
    info: new WorkspaceInfo(info),
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
