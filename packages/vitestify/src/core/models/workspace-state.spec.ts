import { describe, expect, it } from 'vitest';
import { findingType } from './finding';
import { relativePath, type RelativePath } from './relative-path';
import { fileTag, type FileTag, WorkspaceState } from './workspace-state';

describe(WorkspaceState, () => {
  it('returns a file with its matching project', () => {
    const state = stateWithFiles(
      [{ path: relativePath('apps/my-app/src/app.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      },
    );

    expect(state.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.ts',
        projects: [{ name: 'my-app', path: 'apps/my-app' }],
      },
    ]);
  });

  it('returns a file even when there are no projects matching', () => {
    const state = stateWithFiles(
      [{ path: relativePath('libs/frontend/a/index.ts') }],
      { projects: [] },
    );

    expect(state.getFiles()).toMatchObject([
      { path: 'libs/frontend/a/index.ts' },
    ]);
  });

  it('returns a file with multiple projects when it belongs to different paths', () => {
    const state = stateWithFiles(
      [{ path: relativePath('libs/frontend/a/index.ts') }],
      {
        projects: [
          { name: 'a', path: relativePath('libs/frontend/a') },
          { path: relativePath('libs/frontend') },
        ],
      },
    );

    expect(state.getFiles()).toMatchObject([
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
    const state = stateWithFiles(
      [{ path: relativePath('libs/backend/jest.config.ts') }],
      {
        projects: [
          { name: 'backend', path: relativePath('libs/backend') },
          { path: relativePath('libs/backend') },
        ],
      },
    );

    expect(state.getFiles()).toMatchObject([
      {
        path: 'libs/backend/jest.config.ts',
        projects: [{ name: 'backend', path: 'libs/backend' }],
      },
    ]);
  });

  it('merges unnamed projects with the same path', () => {
    const state = stateWithFiles(
      [{ path: relativePath('libs/backend/jest.config.ts') }],
      {
        projects: [
          { path: relativePath('libs/backend') },
          { path: relativePath('libs/backend') },
        ],
      },
    );

    expect(state.getFiles()).toMatchObject([
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

    const state = stateWithFiles(
      [{ path: relativePath('libs/backend/a/index.ts') }],
      {
        projects: [
          { name: 'backend-a', path: relativePath('libs/backend/a') },
          { name: '@marmicode/a', path: relativePath('libs/backend/a') },
        ],
      },
    );

    expect(state.getFiles()).toMatchObject([
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
    const state = stateWithFiles([{ path: relativePath('src/app.ts') }], {
      projects: [{ name: 'my-app', path: relativePath('.') }],
    });

    expect(state.getFiles()).toMatchObject([
      {
        path: 'src/app.ts',
        projects: [{ name: 'my-app', path: '.' }],
      },
    ]);
  });

  it('finds project files by project name', () => {
    const state = stateWithFiles(
      [{ path: relativePath('apps/my-app/src/app.spec.ts') }],
      {
        projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      },
    );

    expect(state.getProjectFiles('my-app')).toMatchObject([
      {
        path: 'apps/my-app/src/app.spec.ts',
      },
    ]);
  });

  it('finds project files by project path', () => {
    const state = stateWithFiles(
      [{ path: relativePath('libs/backend/jest.config.ts') }],
      {
        projects: [{ path: relativePath('libs/backend') }],
      },
    );

    expect(state.getProjectFiles('libs/backend')).toMatchObject([
      {
        path: 'libs/backend/jest.config.ts',
      },
    ]);
  });

  it('finds project files by project name when project is at root', () => {
    const state = stateWithFiles([{ path: relativePath('src/app.spec.ts') }], {
      projects: [{ name: 'my-app', path: relativePath('.') }],
    });

    expect(state.getProjectFiles('my-app')).toMatchObject([
      {
        path: 'src/app.spec.ts',
      },
    ]);
  });

  it('finds project files by project path when project is at root', () => {
    const state = stateWithFiles([{ path: relativePath('src/app.spec.ts') }], {
      projects: [{ path: relativePath('.') }],
    });

    expect(state.getProjectFiles('.')).toMatchObject([
      {
        path: 'src/app.spec.ts',
      },
    ]);
  });

  it('applyEnrichment() tags files', () => {
    const state = new WorkspaceState();

    state.applyEnrichment({
      fileInfos: [
        {
          path: relativePath('src/app.ts'),
          tags: [fileTag('code')],
        },
      ],
    });

    expect(state.getFiles()).toMatchObject([
      { path: 'src/app.ts', tags: ['code'] },
    ]);
  });

  it('tag() adds a tag retrievable via getFiles()', () => {
    const state = new WorkspaceState();
    const path = relativePath('apps/my-app/src/app.spec.ts');

    state.tag(path, fileTag('test'));

    expect(state.getFiles()).toEqual([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
        findings: [],
        projects: [],
      },
    ]);
  });

  it('duplicate tag() calls are idempotent', () => {
    const state = new WorkspaceState();
    const path = relativePath('apps/my-app/src/app.spec.ts');
    const tag = fileTag('test');

    state.tag(path, tag);
    state.tag(path, tag);

    expect(state.getFiles()).toEqual([
      {
        path: 'apps/my-app/src/app.spec.ts',
        tags: ['test'],
        findings: [],
        projects: [],
      },
    ]);
  });

  it('keeps tags after rename', () => {
    const state = new WorkspaceState();
    const originalPath = relativePath('apps/my-app/src/app.spec.ts');

    state.tag(originalPath, fileTag('test'));

    state.rename(originalPath, relativePath('apps/my-app/src/app.jest.cts'));

    expect(state.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.jest.cts',
        tags: ['test'],
      },
    ]);
  });

  it('stores findings on file info', () => {
    const state = new WorkspaceState();
    const path = relativePath('apps/my-app/src/app.spec.ts');
    const type = findingType('jest-symbol');

    state.applyHeuristicResults({
      findings: [{ type, filePath: path }],
    });

    expect(state.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.spec.ts',
        findings: [findingType('jest-symbol')],
      },
    ]);
  });

  it('dedupes finding types with the same type on the same file', () => {
    const state = new WorkspaceState();
    const path = relativePath('apps/my-app/src/app.spec.ts');
    const type = findingType('jest-symbol');

    state.applyHeuristicResults({
      findings: [
        { type, filePath: path },
        { type, filePath: path },
      ],
    });

    expect(state.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.spec.ts',
        findings: [findingType('jest-symbol')],
      },
    ]);
  });

  it('merges multiple types from one heuristic result', () => {
    const state = new WorkspaceState();
    const path = relativePath('apps/my-app/jest.setup.ts');

    state.applyHeuristicResults({
      findings: [
        {
          type: findingType('testing-library-jest-dom'),
          filePath: path,
        },
        {
          type: findingType('testing-library-react'),
          filePath: path,
        },
      ],
    });

    expect(state.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/jest.setup.ts',
        findings: [
          findingType('testing-library-jest-dom'),
          findingType('testing-library-react'),
        ],
      },
    ]);
  });

  it('keeps findings after rename', () => {
    const state = new WorkspaceState();
    const originalPath = relativePath('apps/my-app/src/app.spec.ts');
    const newPath = relativePath('apps/my-app/src/app.jest.cts');

    state.applyHeuristicResults({
      findings: [
        {
          type: findingType('jest-symbol'),
          filePath: originalPath,
        },
      ],
    });

    state.rename(originalPath, newPath);

    expect(state.getFiles()).toMatchObject([
      {
        path: 'apps/my-app/src/app.jest.cts',
        findings: [findingType('jest-symbol')],
      },
    ]);
  });

  it('removes findings after delete', () => {
    const state = new WorkspaceState();
    const path = relativePath('apps/my-app/main.ts');

    state.applyHeuristicResults({
      findings: [
        {
          type: findingType('code'),
          filePath: path,
        },
      ],
    });

    state.delete(path);

    expect(state.getFiles()).toEqual([]);
  });

  it('recomputes projects after rename', () => {
    const state = new WorkspaceState({
      projects: [
        { name: 'app-a', path: relativePath('apps/app-a') },
        { name: 'app-b', path: relativePath('apps/app-b') },
      ],
    });
    const originalPath = relativePath('apps/app-a/src/app.spec.ts');

    state.tag(originalPath, fileTag('test'));
    state.rename(originalPath, relativePath('apps/app-b/src/app.spec.ts'));

    expect(state.getFiles()).toMatchObject([
      {
        path: 'apps/app-b/src/app.spec.ts',
        projects: [{ name: 'app-b', path: 'apps/app-b' }],
      },
    ]);
  });

  it('invalidates cached files after tag()', () => {
    const state = stateWithFiles([
      { path: relativePath('apps/my-app/src/app.ts') },
    ]);

    state.getFiles();

    state.tag(relativePath('apps/my-app/src/app.spec.ts'), fileTag('test'));

    expect(state.getFiles()).toMatchObject([
      { path: 'apps/my-app/src/app.ts' },
      { path: 'apps/my-app/src/app.spec.ts', tags: ['test'] },
    ]);
  });

  it('recomputes projects after enrichment instead of serving previous state', () => {
    const state = new WorkspaceState({
      projects: [],
    });
    const path = relativePath('apps/app-a/src/app.spec.ts');

    state.tag(path, fileTag('test'));

    /* Deep clone because objects are mutated for performance reasons. */
    const filesBeforeEnrichment = JSON.parse(JSON.stringify(state.getFiles()));

    state.applyEnrichment({
      projects: [{ name: 'app-a', path: relativePath('apps/app-a') }],
    });

    const filesAfterEnrichment = state.getFiles();

    expect.soft(filesBeforeEnrichment).toMatchObject([
      {
        path: 'apps/app-a/src/app.spec.ts',
        projects: [],
      },
    ]);
    expect.soft(filesAfterEnrichment).toMatchObject([
      {
        path: 'apps/app-a/src/app.spec.ts',
        projects: [{ name: 'app-a', path: 'apps/app-a' }],
      },
    ]);
  });

  it('applyEnrichment() merges projects and package manager', () => {
    const state = new WorkspaceState();

    state.applyEnrichment({
      projects: [{ name: 'my-app', path: relativePath('apps/my-app') }],
      packageManager: 'pnpm',
    });

    expect(state.getProjects()).toMatchObject([
      { name: 'my-app', path: 'apps/my-app' },
    ]);
    expect(state.getPackageManager()).toBe('pnpm');
  });
});

function stateWithFiles(
  files: Array<{ path: RelativePath; tags?: FileTag[] }>,
  info: ConstructorParameters<typeof WorkspaceState>[0] = {},
): WorkspaceState {
  const state = new WorkspaceState(info);

  for (const file of files) {
    const tags = file.tags ?? [fileTag('code')];

    for (const tag of tags) {
      state.tag(file.path, tag);
    }
  }

  return state;
}
