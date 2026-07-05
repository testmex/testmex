import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../core/models/workspace.mother';
import { Analyzer } from '../../pipeline/analyzer';
import { fileTags, findingTypes } from './identifiers';
import { testingLibraryHeuristic } from './testing-library-heuristic';

describe('testingLibraryHeuristic', () => {
  it('reports jest-dom findings in setup code files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `import '@testing-library/jest-dom';`,
          fileName: 'jest.setup.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [testingLibraryHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([
      { type: findingTypes.testingLibraryJestDom },
    ]);
  });

  it('reports angular findings in test files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.testFile({
          appName: 'my-app',
          content: `import { render } from '@testing-library/angular';`,
          fileName: 'src/app/app.component.spec.ts',
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [testingLibraryHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([
      { type: findingTypes.testingLibraryAngular },
    ]);
  });

  it('reports multiple findings in the same file', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `\
import '@testing-library/jest-dom';
import { render } from '@testing-library/angular';
`,
          fileName: 'jest.setup.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [testingLibraryHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([
      { type: findingTypes.testingLibraryJestDom },
      { type: findingTypes.testingLibraryAngular },
    ]);
  });

  it('reports react findings in test files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.testFile({
          appName: 'my-app',
          content: `import { render } from '@testing-library/react';`,
          fileName: 'src/app/app.spec.tsx',
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [testingLibraryHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([
      { type: findingTypes.testingLibraryReact },
    ]);
  });

  it('returns no findings when testing library imports are absent', async () => {
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

    const analyzer = new Analyzer({ heuristics: [testingLibraryHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toEqual([]);
  });
});
