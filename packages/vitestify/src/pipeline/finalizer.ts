import type { Workspace } from '../core/domain/workspace';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const body = (phase: string, detail?: string) =>
  detail === undefined ? phase : `${phase} · ${detail}`;

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
    const stepCount = commands.length;

    for (const [index, command] of commands.entries()) {
      const commandString = command.join(' ');
      const progressStep = this._progressReporter.createStep({
        name: `command: ${commandString}`,
        stepNumber: index + 1,
        stepCount,
      });

      progressStep.message('running');

      try {
        await this._commandRunner.run(command);
        progressStep.done('succeeded');
      } catch (error) {
        progressStep.error(
          body(
            'failed',
            error instanceof Error ? error.message : String(error),
          ),
        );
        continue;
      }
    }
  }
}
