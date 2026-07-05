import { describe, expect, it } from 'vitest';
import { relativePath } from './relative-path';
import { WorkspaceInfo } from './workspace-info';

describe(WorkspaceInfo.name, () => {
  it('returns a file with its matching project', () => {
    const info = new WorkspaceInfo({
      files: [{ path: relativePath('apps/my-app/src/app.ts'), tags: [] }],
      projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
    });

    expect(info.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.ts',
        projects: [{ name: 'my-app', path: 'apps/my-app' }],
      },
    ]);
  });

  it('returns a file even when there are no projects matching', () => {
    const info = new WorkspaceInfo({
      files: [{ path: relativePath('libs/frontend/a/index.ts'), tags: [] }],
      projects: [],
    });

    expect(info.getFiles()).toMatchObject([
      { path: 'libs/frontend/a/index.ts' },
    ]);
  });

  it('returns a file with multiple projects when it belongs to different paths', () => {
    const info = new WorkspaceInfo({
      files: [{ path: relativePath('libs/frontend/a/index.ts'), tags: [] }],
      projects: [
        { name: 'a', path: relativePath('libs/frontend/a') },
        { path: relativePath('libs/frontend') },
      ],
    });

    expect(info.getFiles()).toMatchObject([
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
    const info = new WorkspaceInfo({
      files: [{ path: relativePath('libs/backend/jest.config.ts'), tags: [] }],
      projects: [
        { name: 'backend', path: relativePath('libs/backend') },
        { path: relativePath('libs/backend') },
      ],
    });

    expect(info.getFiles()).toMatchObject([
      {
        path: 'libs/backend/jest.config.ts',
        projects: [{ name: 'backend', path: 'libs/backend' }],
      },
    ]);
  });

  it('merges unnamed projects with the same path', () => {
    const info = new WorkspaceInfo({
      files: [{ path: relativePath('libs/backend/jest.config.ts'), tags: [] }],
      projects: [
        { path: relativePath('libs/backend') },
        { path: relativePath('libs/backend') },
      ],
    });

    expect(info.getFiles()).toMatchObject([
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

    const info = new WorkspaceInfo({
      files: [{ path: relativePath('libs/backend/a/index.ts'), tags: [] }],
      projects: [
        { name: 'backend-a', path: relativePath('libs/backend/a') },
        { name: '@marmicode/a', path: relativePath('libs/backend/a') },
      ],
    });

    expect(info.getFiles()).toMatchObject([
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
    const info = new WorkspaceInfo({
      files: [
        {
          path: relativePath('apps/my-app/src/app.spec.ts'),
          tags: [],
        },
      ],
      projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
    });

    expect(info.getProjectFiles('my-app')).toMatchObject([
      {
        path: 'apps/my-app/src/app.spec.ts',
      },
    ]);
  });

  it('finds project files by project path', () => {
    const info = new WorkspaceInfo({
      files: [
        {
          path: relativePath('libs/backend/jest.config.ts'),
          tags: [],
        },
      ],
      projects: [{ path: relativePath('libs/backend') }],
    });

    expect(info.getProjectFiles('libs/backend')).toMatchObject([
      {
        path: 'libs/backend/jest.config.ts',
      },
    ]);
  });
});
