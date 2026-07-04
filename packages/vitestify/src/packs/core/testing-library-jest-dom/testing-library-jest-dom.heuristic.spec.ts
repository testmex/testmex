import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { Analyzer } from '../../../pipeline/analyzer';
import { fileTags } from '../identifiers';
import { testingLibraryJestDomHeuristic } from './testing-library-jest-dom.heuristic';

describe('testingLibraryJestDomHeuristic', () => {
  it('reports findings in setup code files', async () => {
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

    const analyzer = new Analyzer({
      heuristics: [testingLibraryJestDomHeuristic],
    });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([{ type: 'testing-library-jest-dom' }]);
  });
});
