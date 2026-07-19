import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { ProgressTracker } from '../../../../core/models/progress-tracker';
import { Analyzer } from '../../../../pipeline/analyzer';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { jestSymbolHeuristic } from './jest-symbol.heuristic';

describe('jestSymbolHeuristic', () => {
  it('reports findings in code files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'jest.spyOn(service, "method");',
          fileName: 'src/testing/utils.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({
      heuristics: [jestSymbolHeuristic],
      progressTracker: new ProgressTracker(),
    });
    await analyzer.analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/testing/utils.ts',
        findings: [findingTypes.jestSymbol],
      },
    ]);
  });
});
