import { describe, expect, it } from 'vitest';
import { ProgressTracker } from '../models/progress-tracker';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../models/workspace.mother';
import { CommandRunnerFake } from '../ports/command-runner.fake';
import { defineFileTransform } from './define-file-transform';
import { fileTag } from './workspace';

describe(defineFileTransform, () => {
  it('does not increment transformed count when apply returns identical content', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'const value = 42;',
          fileName: 'foo.ts',
          tags: [fileTag('code')],
        }).build(),
      ),
    );

    const progressTracker = new ProgressTracker();
    const progressStep = progressTracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'identity' });

    await defineFileTransform({
      name: 'identity',
      fileTags: [fileTag('code')],
      apply: (content) => content,
    }).apply({
      commandRunner: new CommandRunnerFake(),
      progressStep,
      workspace,
    });

    expect
      .soft(
        progressTracker
          .snapshot()
          .phases.find((phase) => phase.kind === 'transforming')
          ?.steps.find((step) => step.kind === 'transform'),
      )
      .toMatchObject({ transformedFileCount: 0 });
  });
});
