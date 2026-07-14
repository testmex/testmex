import type { Workspace } from '../core/domain/workspace';
import type { Transform } from '../core/models/transform';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

export class Transformer {
  private readonly _progressReporter: ProgressReporter;
  private readonly _transforms: Transform[];

  constructor({
    transforms,
    progressReporter = new NullProgressReporter(),
  }: {
    transforms: Transform[];
    progressReporter?: ProgressReporter;
  }) {
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
        await transform.apply(workspace, {
          onProgress: (message) => {
            lastMessage = message;
            progressStep.message(_formatMessage('transforming', message));
          },
        });

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
  }
}

const _formatMessage = (phase: string, detail?: string) =>
  detail === undefined ? phase : `${phase} · ${detail}`;
