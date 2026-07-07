import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { Analyzer } from '../../../../pipeline/analyzer';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { vitestImportsNeededHeuristic } from './vitest-imports-needed.heuristic';

describe('vitestImportsNeededHeuristic', () => {
  it('reports findings in code files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `expect(value).toBe(expected);`,
          fileName: 'src/testing/utils.ts',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    const analyzer = new Analyzer({ heuristics: [vitestImportsNeededHeuristic] });
    const findings = await analyzer.analyze(workspace);

    expect(findings).toMatchObject([
      { type: findingTypes.vitestImportsNeeded },
    ]);
  });
});
