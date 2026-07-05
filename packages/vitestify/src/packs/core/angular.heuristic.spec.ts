import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../core/models/workspace.mother';
import { Analyzer } from '../../pipeline/analyzer';
import { angularHeuristic } from './angular.heuristic';
import { fileTags, findingTypes } from './identifiers';

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
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([{ type: findingTypes.angular }]);
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
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([{ type: findingTypes.angular }]);
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
    const findings = await analyzer.analyze(workspace);

    expect(findings).toEqual([]);
  });

  it('returns no findings when @angular appears in a line comment', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `// TODO: migrate @angular/core imports manually`,
          fileName: 'src/app/utils.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [angularHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toEqual([]);
  });

  it('returns no findings when @angular appears in a block comment', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `/* docs mention @angular/core but this is not an import */`,
          fileName: 'src/app/utils.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [angularHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toEqual([]);
  });
});
