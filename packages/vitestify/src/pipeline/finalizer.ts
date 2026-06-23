import debug from 'debug';
import type { Workspace } from '../core/domain/workspace';
import type { CommandRunner } from '../core/ports/command-runner';

const log = debug('vitestify:finalizer');

export class Finalizer {
  private readonly _commandRunner: CommandRunner;

  constructor({ commandRunner }: { commandRunner: CommandRunner }) {
    this._commandRunner = commandRunner;
  }

  async finalize(workspace: Workspace): Promise<void> {
    const commands = workspace.commands.all();
    log(`running ${commands.length} commands`);
    for (const [index, command] of commands.entries()) {
      log(`command ${index + 1}/${commands.length}: ${command.join(' ')}`);
      await this._commandRunner.run(command);
    }
    log('done');
  }
}
