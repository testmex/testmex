import type { Workspace } from '../core/domain/workspace';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const COMMAND_MESSAGE_PREFIX = {
  running: 'Running command',
  success: 'Command success',
  error: 'Command failed',
} as const;

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

      const formatCommandMessage = (
        phase: keyof typeof COMMAND_MESSAGE_PREFIX,
        message?: string,
      ) => {
        const prefix = COMMAND_MESSAGE_PREFIX[phase];
        const line = `${prefix} [${step}/${total}] ${commandString}`;
        return message === undefined ? line : `${line} · ${message}`;
      };

      spinner.message(formatCommandMessage('running'));

      try {
        await this._commandRunner.run(command);
        spinner.done(formatCommandMessage('success'));
      } catch (error) {
        spinner.error(
          formatCommandMessage(
            'error',
            error instanceof Error ? error.message : String(error),
          ),
        );
        continue;
      }
    }
  }
}
