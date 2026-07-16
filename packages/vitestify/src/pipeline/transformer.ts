import type { Workspace } from '../core/domain/workspace';
import type { Transform, TransformResult } from '../core/models/transform';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { Phase, ProgressReporter } from '../core/ports/progress-reporter';
import { CommandFlusher } from './command-flusher';

export class Transformer {
  private readonly _commandFlusher: CommandFlusher;
  private readonly _commandRunner: CommandRunner;
  private readonly _progressReporter: ProgressReporter;
  private readonly _transforms: Transform[];

  constructor({
    commandRunner,
    transforms,
    progressReporter = new NullProgressReporter(),
  }: {
    commandRunner: CommandRunner;
    transforms: Transform[];
    progressReporter?: ProgressReporter;
  }) {
    this._commandFlusher = new CommandFlusher({
      commandRunner,
      progressReporter,
    });
    this._commandRunner = commandRunner;
    this._progressReporter = progressReporter;
    this._transforms = transforms;
  }

  async transform(workspace: Workspace): Promise<void> {
    const stepCount = this._transforms.length;
    const phase = this._progressReporter.createPhase('Transforming');

    for (const [index, transform] of this._transforms.entries()) {
      const result = await this._applyTransform({
        phase,
        stepCount,
        stepNumber: index + 1,
        transform,
        workspace,
      });

      if (result) {
        await workspace.tree.commit();
        await this._commandFlusher.flush(workspace);
        const verifyResult = await result.verify();
        await verifyResult?.rollback();
      }
    }

    phase.done();

    await workspace.tree.commit();
    await this._commandFlusher.flush(workspace);
  }

  private async _applyTransform({
    phase,
    stepCount,
    stepNumber,
    transform,
    workspace,
  }: {
    phase: Phase;
    stepCount: number;
    stepNumber: number;
    transform: Transform;
    workspace: Workspace;
  }): Promise<void | TransformResult> {
    const progressStep = phase.createStep({
      name: transform.name,
      stepNumber,
      stepCount,
    });
    let lastMessage: string | undefined;

    progressStep.updateMessage('transforming');

    try {
      const result = await transform.apply({
        workspace,
        commandRunner: this._commandRunner,
        onProgress: (message) => {
          lastMessage = message;
          progressStep.updateMessage(
            this._formatMessage('transforming', message),
          );
        },
      });

      progressStep.done(this._formatMessage('transformed', lastMessage));

      return result;
    } catch (error) {
      progressStep.error(
        this._formatMessage(
          'failed',
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  private _formatMessage(phase: string, detail?: string) {
    return detail === undefined ? phase : `${phase} · ${detail}`;
  }
}
