import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { Analyzer } from '../../../../pipeline/analyzer';
import { angularHeuristic } from './angular.heuristic';
import { fileTags, findingTypes } from '../../identifiers';

describe('angularHeuristic', () => {
  it('reports findings in code files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `import { Component } from '@angular/core';`,
          fileName: 'src/app/app.component.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [angularHeuristic] });
    await analyzer.analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app/app.component.ts',
        findings: ['angular'],
      },
    ]);
  });

  it('reports findings in test files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.testFile({
          appName: 'my-app',
          content: `import { TestBed } from '@angular/core/testing';`,
          fileName: 'src/app/app.component.spec.ts',
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [angularHeuristic] });
    await analyzer.analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app/app.component.spec.ts',
        findings: ['angular'],
      },
    ]);
  });

  it('returns no findings when angular is absent', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `export const value = 42;`,
          fileName: 'src/app/utils.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [angularHeuristic] });
    await analyzer.analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app/utils.ts',
        findings: [],
      },
    ]);
  });

  it('returns no findings when @angular appears without quotes', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `// migrate @angular/core imports manually`,
          fileName: 'src/app/utils.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [angularHeuristic] });
    await analyzer.analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app/utils.ts',
        findings: [],
      },
    ]);
  });
});
