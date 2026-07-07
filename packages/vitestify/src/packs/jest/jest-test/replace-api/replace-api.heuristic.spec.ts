import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { Analyzer } from '../../../../pipeline/analyzer';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { replaceApiHeuristic } from './replace-api.heuristic';

describe('replaceApiHeuristic', () => {
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

    const analyzer = new Analyzer({ heuristics: [replaceApiHeuristic] });
    await analyzer.analyze(workspace);

    expect(workspace.findings).toEqual([
      {
        type: findingTypes.jestSymbol,
        projects: [{ name: 'my-app', path: 'apps/my-app' }],
        filePath: 'apps/my-app/src/testing/utils.ts',
      },
    ]);
  });
});
