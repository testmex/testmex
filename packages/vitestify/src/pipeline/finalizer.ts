import d from 'debug';
import type { Workspace } from '../core/domain/workspace';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const debug = d('vitestify:finalizer');

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
    for (const [index, command] of commands.entries()) {
      const step = index + 1;
      const total = commands.length;
      const commandString = command.join(' ');
      const spinner = this._progressReporter.createSpinner();
      spinner.message(`Running command [${step}/${total}] ${commandString}`);
      await this._commandRunner.run(command);
      spinner.done(`Command success [${step}/${total}] ${commandString}`);
    }
  }
}
