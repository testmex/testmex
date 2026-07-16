import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../models/workspace.mother';
import { CommandRunnerFake } from '../ports/command-runner.fake';
import { ProgressReporterFake } from '../ports/progress-reporter.fake';
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

    const progressReporter = new ProgressReporterFake();
    const progressStep = progressReporter
      .createPhase('transform')
      .createStep({ name: 'identity' });

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
      .soft(progressReporter.phases()[0].steps[0].message)
      .toBe('0 file(s) transformed');
  });
});
