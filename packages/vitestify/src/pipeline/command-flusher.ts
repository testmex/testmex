import type { Workspace } from '../core/domain/workspace';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const body = (phase: string, detail?: string) =>
  detail === undefined ? phase : `${phase} · ${detail}`;

export class CommandFlusher {
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

  async flush(workspace: Workspace): Promise<void> {
    const commands = workspace.commands.drain();
    const stepCount = commands.length;
    const phase = this._progressReporter.createPhase('Commands');

    for (const [index, command] of commands.entries()) {
      const commandString = command.join(' ');
      const progressStep = phase.createStep({
        name: `command: ${commandString}`,
        stepNumber: index + 1,
        stepCount,
      });

      progressStep.updateMessage('running');

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

    phase.done();
  }
}
