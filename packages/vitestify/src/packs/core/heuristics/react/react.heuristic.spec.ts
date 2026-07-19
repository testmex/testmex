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
import { reactHeuristic } from './react.heuristic';

describe('reactHeuristic', () => {
  it('reports findings in code files', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `import { useState } from 'react';`,
          fileName: 'src/app/app.tsx',
          tags: [fileTags.code],
        }).build(),
      ),
    );

    await _analyze(workspace);

    expect(workspace.files).toMatchObject([
      {
        path: 'apps/my-app/src/app/app.tsx',
        findings: [findingTypes.react],
      },
    ]);
  });

  it('returns no findings when react appears without quotes', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `// migrate react imports manually`,
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
    heuristics: [reactHeuristic],
    progressTracker: new ProgressTracker(),
  });
  await analyzer.analyze(workspace);
}
