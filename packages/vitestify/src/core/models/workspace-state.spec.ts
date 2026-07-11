import { describe, expect, it } from 'vitest';
import { fileTag } from '../domain/workspace';
import { relativePath } from './relative-path';
import { WorkspaceState } from './workspace-state';

describe(WorkspaceState, () => {
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

  it('recomputes projects after enrichment instead of serving previous state', () => {
    const state = new WorkspaceState({
      projects: [],
    });
    const path = relativePath('apps/app-a/src/app.spec.ts');

    state.tag(path, fileTag('test'));

    const filesBeforeEnrichment = state.getFiles();

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
});
