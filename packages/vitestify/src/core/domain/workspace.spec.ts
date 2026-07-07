import { describe, expect, it } from 'vitest';
import { Tree } from './tree';
import { Workspace } from './workspace';
import { relativePath, type RelativePath } from '../models/relative-path';
import { FileSystemFake } from '../ports/file-system.fake';
import { fileTag, WorkspaceInfo, type FileTag } from '../models/workspace-info';

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

  it('applyEnrichment() tags files on the tree', () => {
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
  const tree = new Tree({ fileSystem: new FileSystemFake() });

  for (const file of files) {
    const tags = file.tags ?? [fileTag('tracked')];

    for (const tag of tags) {
      tree.tag(file.path, tag);
    }
  }

  return new Workspace({ info: new WorkspaceInfo(info), tree });
}
