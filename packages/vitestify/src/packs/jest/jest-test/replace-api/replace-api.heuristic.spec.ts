import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../../core/models/relative-path';
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
  it.todo('reports findings in code files', async () => {
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
    const findings = await analyzer.analyze(workspace);

    expect(findings).toEqual([
      {
        type: findingTypes.jestSymbol,
        project: { name: 'my-app', path: relativePath('apps/my-app') },
        file: {
          path: relativePath('apps/my-app/src/test-utils.ts'),
          tags: [fileTags.code],
        },
      },
    ]);
  });
});
