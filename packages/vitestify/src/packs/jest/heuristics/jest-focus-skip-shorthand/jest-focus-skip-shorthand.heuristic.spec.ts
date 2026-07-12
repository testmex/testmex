import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { Analyzer } from '../../../../pipeline/analyzer';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { jestFocusSkipShorthandHeuristic } from './jest-focus-skip-shorthand.heuristic';

describe('jestFocusSkipShorthandHeuristic', () => {
  it('reports findings in code files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `fit('focused helper', () => { /* … */ });`,
          fileName: 'src/testing/utils.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({
      heuristics: [jestFocusSkipShorthandHeuristic],
    });
    await analyzer.analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/testing/utils.ts',
        findings: [findingTypes.jestFocusSkipShorthand],
      },
    ]);
  });
});
