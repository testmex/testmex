import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { defineWorkspace } from '../core/domain/workspace';
import { createWorkspaceInfo } from '../core/models/workspace-info';
import type { Command, CommandRunner } from '../core/ports/command-runner';
import { FileSystemFake } from '../core/ports/file-system.fake';
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
    const workspace = defineWorkspace({
      info: createWorkspaceInfo(),
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
});
