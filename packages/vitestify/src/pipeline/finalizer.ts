import debug from 'debug';
import type { Workspace } from '../core/domain/workspace';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const log = debug('vitestify:finalizer');

export class Finalizer {
  private readonly _commandRunner: CommandRunner;
  private readonly _progressReporter: ProgressReporter;

  constructor({
    commandRunner,
    progressReporter = new NullProgressReporter(),
  }: {
    commandRunner: CommandRunner;
    progressReporter?: ProgressReporter;
  }) {
    this._commandRunner = commandRunner;
    this._progressReporter = progressReporter;
  }

  async finalize(workspace: Workspace): Promise<void> {
    const commands = workspace.commands.all();
    log(`running ${commands.length} commands`);
    for (const [index, command] of commands.entries()) {
      log(`command ${index + 1}/${commands.length}: ${command.join(' ')}`);
      const commandString = command.join(' ');
      const spinner = this._progressReporter.createSpinner();
      spinner.message(`Running command: ${commandString}`);
      await this._commandRunner.run(command);
      spinner.done(`Command done: ${commandString}`);
    }
    log('done');
  }
}
