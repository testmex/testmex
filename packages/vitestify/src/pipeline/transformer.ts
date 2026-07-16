import type { Workspace } from '../core/domain/workspace';
import type { Transform, TransformResult } from '../core/models/transform';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { Phase, ProgressReporter } from '../core/ports/progress-reporter';
export class Transformer {
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

      /* We only verify if the transform asked for it and if the workspace has pending changes. */
      if (result && workspace.tree.isDirty()) {
        await this._applyChanges({ workspace, phase });

        const verifyStep = phase.createStep({ name: 'Verifying' });
        const verifyResult = await result.verify({ progressStep: verifyStep });

        if (verifyResult) {
          verifyStep.error('failed');
          const rollbackStep = phase.createStep({ name: 'Rolling back' });
          await verifyResult.rollback({ progressStep: rollbackStep });
          rollbackStep.done('rolled back');
        } else {
          verifyStep.done('verified');
        }
      }
    }

    await this._applyChanges({ workspace, phase });

    phase.done();
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
    let lastMessageDetail: string | undefined;

    progressStep.updateMessage('transforming');

    try {
      const result = await transform.apply({
        workspace,
        commandRunner: this._commandRunner,
        progressStep: {
          ...progressStep,
          updateMessage: (detail) => {
            lastMessageDetail = detail;
            progressStep.updateMessage(
              this._concatMessages(['transforming', detail]),
            );
          },
        },
      });

      progressStep.done(
        this._concatMessages(
          lastMessageDetail === undefined
            ? ['transformed']
            : ['transformed', lastMessageDetail],
        ),
      );

      return result;
    } catch (error) {
      progressStep.error(
        this._concatMessages([
          'failed',
          error instanceof Error ? error.message : String(error),
        ]),
      );
    }
  }

  private async _applyChanges({
    phase,
    workspace,
  }: {
    phase: Phase;
    workspace: Workspace;
  }): Promise<void> {
    const progressStep = phase.createStep({ name: 'Applying changes' });
    const commitSubStep = progressStep.createSubStep('applying changes');
    const { count } = await workspace.tree.commit();
    commitSubStep?.updateMessage(`applied ${count} changes`);

    for (const command of workspace.commands.drain()) {
      const subStepLabel = command.join(' ');
      const subStep = progressStep.createSubStep(
        this._concatMessages([subStepLabel, 'running']),
      );

      try {
        await this._commandRunner.run(command);
        subStep?.updateMessage(
          this._concatMessages([subStepLabel, 'succeeded']),
        );
      } catch (error) {
        subStep?.updateMessage(
          this._concatMessages([
            subStepLabel,
            'failed',
            error instanceof Error ? error.message : String(error),
          ]),
        );
        continue;
      }
    }

    progressStep.done('done');
  }

  private _concatMessages(messages: string[]) {
    return messages.join(' · ');
  }
}
