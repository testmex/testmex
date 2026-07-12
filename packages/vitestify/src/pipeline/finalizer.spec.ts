import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { WorkspaceState } from '../core/models/workspace-state';
import { CommandRunnerFake } from '../core/ports/command-runner.fake';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
import { Finalizer } from './finalizer';

describe(Finalizer, () => {
  it('runs queued commands in order', async () => {
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure({
      'npm install vitest': { output: '' },
      'npx nx add @nx/vitest': { output: '' },
    });
    const finalizer = new Finalizer({ commandRunner });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.commands.add(['npm', 'install', 'vitest']);
    workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);

    await finalizer.finalize(workspace);

    expect(commandRunner.executedCommands()).toEqual([
      ['npm', 'install', 'vitest'],
      ['npx', 'nx', 'add', '@nx/vitest'],
    ]);
  });

  it('finalizer reports command string during run', async () => {
    const progressReporter = new ProgressReporterFake();
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure({
      'npm install vitest': { output: '' },
      'npx nx add @nx/vitest': { output: '' },
    });
    const finalizer = new Finalizer({ commandRunner, progressReporter });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.commands.add(['npm', 'install', 'vitest']);
    workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);

    await finalizer.finalize(workspace);

    expect(progressReporter.messages()).toEqual([
      'Running command [1/2] npm install vitest',
      'Command success [1/2] npm install vitest',
      'Running command [2/2] npx nx add @nx/vitest',
      'Command success [2/2] npx nx add @nx/vitest',
    ]);
  });

  it('finalizer reports command error on failure', async () => {
    const progressReporter = new ProgressReporterFake();
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure({
      'npm install vitest': { error: new Error('install failed') },
    });
    const finalizer = new Finalizer({ commandRunner, progressReporter });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.commands.add(['npm', 'install', 'vitest']);

    await finalizer.finalize(workspace);

    expect(progressReporter.errors()).toEqual([
      'Command failed [1/1] npm install vitest · install failed',
    ]);
  });

  it('finalizer continues to next command after failure', async () => {
    const progressReporter = new ProgressReporterFake();
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure({
      'npm install vitest': { error: new Error('install failed') },
      'npx nx add @nx/vitest': { output: '' },
    });
    const finalizer = new Finalizer({ commandRunner, progressReporter });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.commands.add(['npm', 'install', 'vitest']);
    workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);

    await finalizer.finalize(workspace);

    expect(commandRunner.executedCommands()).toEqual([
      ['npm', 'install', 'vitest'],
      ['npx', 'nx', 'add', '@nx/vitest'],
    ]);
    expect
      .soft(progressReporter.errors())
      .toEqual(['Command failed [1/2] npm install vitest · install failed']);
    expect
      .soft(progressReporter.messages())
      .toEqual([
        'Running command [1/2] npm install vitest',
        'Running command [2/2] npx nx add @nx/vitest',
        'Command success [2/2] npx nx add @nx/vitest',
      ]);
  });
});
