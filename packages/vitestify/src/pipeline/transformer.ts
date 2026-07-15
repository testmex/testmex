import type { Workspace } from '../core/domain/workspace';
import type { Transform } from '../core/models/transform';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';
import { CommandFlusher } from './command-flusher';

export class Transformer {
  private readonly _commandFlusher: CommandFlusher | undefined;
  private readonly _commandRunner: CommandRunner;
  private readonly _progressReporter: ProgressReporter;
  private readonly _transforms: Transform[];

  constructor({
    commandRunner,
    flushCommands = true,
    transforms,
    progressReporter = new NullProgressReporter(),
  }: {
    commandRunner: CommandRunner;
    flushCommands?: boolean;
    transforms: Transform[];
    progressReporter?: ProgressReporter;
  }) {
    this._commandFlusher = flushCommands
      ? new CommandFlusher({ commandRunner, progressReporter })
      : undefined;
    this._commandRunner = commandRunner;
    this._progressReporter = progressReporter;
    this._transforms = transforms;
  }

  async transform(workspace: Workspace): Promise<void> {
    const stepCount = this._transforms.length;

    for (const [index, transform] of this._transforms.entries()) {
      const progressStep = this._progressReporter.createStep({
        name: transform.name,
        stepNumber: index + 1,
        stepCount,
      });
      let lastMessage: string | undefined;

      progressStep.message('transforming');

      try {
        const result = await transform.apply({
          workspace,
          commandRunner: this._commandRunner,
          onProgress: (message) => {
            lastMessage = message;
            progressStep.message(_formatMessage('transforming', message));
          },
        });

        if (result) {
          await workspace.tree.commit();
          await this._commandFlusher?.flush(workspace);
          const verifyResult = await result.verify();
          await verifyResult?.rollback();
        }

        progressStep.done(_formatMessage('transformed', lastMessage));
      } catch (error) {
        progressStep.error(
          _formatMessage(
            'failed',
            error instanceof Error ? error.message : String(error),
          ),
        );
        continue;
      }
    }

    await workspace.tree.commit();
    await this._commandFlusher?.flush(workspace);
  }
}

const _formatMessage = (phase: string, detail?: string) =>
  detail === undefined ? phase : `${phase} · ${detail}`;
