import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { WorkspaceState } from '../core/models/workspace-state';
import type { Command, CommandRunner } from '../core/ports/command-runner';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
import { Finalizer } from './finalizer';

describe(Finalizer, () => {
  it('runs queued commands in order', async () => {
    const calls: Command[] = [];
    const commandRunner: CommandRunner = {
      run: async (command) => {
        calls.push([...command]);
        return '';
      },
    };
    const finalizer = new Finalizer({ commandRunner });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    workspace.commands.add(['npm', 'install', 'vitest']);
    workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);

    await finalizer.finalize(workspace);

    expect(calls).toEqual([
      ['npm', 'install', 'vitest'],
      ['npx', 'nx', 'add', '@nx/vitest'],
    ]);
  });

  it('finalizer reports command string during run', async () => {
    const progressReporter = new ProgressReporterFake();
    const commandRunner: CommandRunner = {
      run: async () => '',
    };
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
});
