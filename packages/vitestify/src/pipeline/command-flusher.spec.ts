import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { WorkspaceState } from '../core/models/workspace-state';
import { CommandRunnerFake } from '../core/ports/command-runner.fake';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
import { CommandFlusher } from './command-flusher';

describe(CommandFlusher, () => {
  it.todo('drains queued commands on flush', () => {
    // Arrange workspace with 2 queued commands.
    // Run `commandFlusher.flush(workspace)`.
    // Assert both commands executed via `CommandRunner`.
    // Assert command queue is empty after flush.
  });

  it.todo('continues after command failure', () => {
    // Arrange workspace with 2 commands; first fails, second succeeds.
    // Run `commandFlusher.flush(workspace)`.
    // Assert both commands were attempted; second still runs.
  });

  it('flusher reports command string during run', async () => {
    const progressReporter = new ProgressReporterFake();
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure({
      'npm install vitest': { output: '' },
      'npx nx add @nx/vitest': { output: '' },
    });
    const commandFlusher = new CommandFlusher({
      commandRunner,
      progressReporter,
    });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.commands.add(['npm', 'install', 'vitest']);
    workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);

    await commandFlusher.flush(workspace);

    expect(progressReporter.messages()).toEqual([
      '[1/2] command: npm install vitest · running',
      '[1/2] command: npm install vitest · succeeded',
      '[2/2] command: npx nx add @nx/vitest · running',
      '[2/2] command: npx nx add @nx/vitest · succeeded',
    ]);
  });

  it('flusher reports command error on failure', async () => {
    const progressReporter = new ProgressReporterFake();
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure({
      'npm install vitest': { error: new Error('install failed') },
    });
    const commandFlusher = new CommandFlusher({
      commandRunner,
      progressReporter,
    });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.commands.add(['npm', 'install', 'vitest']);

    await commandFlusher.flush(workspace);

    expect(progressReporter.errors()).toEqual([
      '[1/1] command: npm install vitest · failed · install failed',
    ]);
  });
});
