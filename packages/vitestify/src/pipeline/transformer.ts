import type { Workspace } from '../core/domain/workspace';
import type { Transform } from '../core/models/transform';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const TRANSFORM_MESSAGE_PREFIX = {
  transforming: 'Transforming',
  transformed: 'Transformed ',
  error: 'Transform failed',
} as const;

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
    for (const [index, transform] of this._transforms.entries()) {
      const step = index + 1;
      const total = this._transforms.length;
      const spinner = this._progressReporter.createSpinner();
      let lastMessage: string | undefined;

      const formatTransformMessage = (
        phase: keyof typeof TRANSFORM_MESSAGE_PREFIX,
        message?: string,
      ) => {
        const prefix = TRANSFORM_MESSAGE_PREFIX[phase];
        const line = `${prefix} [${step}/${total}] ${transform.name}`;
        return message === undefined ? line : `${line} · ${message}`;
      };

      spinner.message(formatTransformMessage('transforming'));

      try {
        await transform.apply(workspace, {
          onProgress: (message) => {
            lastMessage = message;
            spinner.message(formatTransformMessage('transforming', message));
          },
        });

        spinner.done(formatTransformMessage('transformed', lastMessage));
      } catch (error) {
        spinner.error(
          formatTransformMessage(
            'error',
            error instanceof Error ? error.message : String(error),
          ),
        );
        continue;
      }
    }

    await workspace.tree.commit();
  }
}
