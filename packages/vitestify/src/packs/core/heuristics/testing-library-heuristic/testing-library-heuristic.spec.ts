import { describe, expect, it } from 'vitest';
import type { Workspace } from '../../../../core/domain/workspace';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { ProgressTracker } from '../../../../core/models/progress-tracker';
import { Analyzer } from '../../../../pipeline/analyzer';
import { fileTags, findingTypes } from '../../identifiers';
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

    await _analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/jest.setup.ts',
        findings: [findingTypes.testingLibraryJestDom],
      },
    ]);
  });

  it('reports multiple findings in the same file', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `\
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
`,
          fileName: 'jest.setup.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    await _analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/jest.setup.ts',
        findings: [
          findingTypes.testingLibraryJestDom,
          findingTypes.testingLibraryReact,
        ],
      },
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

    await _analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app/app.spec.tsx',
        findings: [findingTypes.testingLibraryReact],
      },
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

    await _analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app/utils.ts',
        findings: [],
      },
    ]);
  });
});

async function _analyze(workspace: Workspace): Promise<void> {
  const analyzer = new Analyzer({
    heuristics: [testingLibraryHeuristic],
    progressTracker: new ProgressTracker(),
  });
  await analyzer.analyze(workspace);
}
