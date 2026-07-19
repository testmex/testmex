import type { Workspace } from '../core/domain/workspace';
import type { Transform, TransformResult } from '../core/models/transform';
import type { ProgressTracker } from '../core/models/progress-tracker';
import type { TransformingPhase } from '../core/models/progress-tracker/transforming-phase';
import type { CommandRunner } from '../core/ports/command-runner';

export class Transformer {
  private readonly _commandRunner: CommandRunner;
  private readonly _progressTracker: ProgressTracker;
  private readonly _transforms: Transform[];

  private _changesTotalCount = 0;

  constructor({
    commandRunner,
    transforms,
    progressTracker,
  }: {
    commandRunner: CommandRunner;
    transforms: Transform[];
    progressTracker: ProgressTracker;
  }) {
    this._commandRunner = commandRunner;
    this._progressTracker = progressTracker;
    this._transforms = transforms;
  }

  async transform(workspace: Workspace): Promise<void> {
    const phase = this._progressTracker.beginTransforming({
      transformCount: this._transforms.length,
    });

    for (const transform of this._transforms) {
      const result = await this._applyTransform({
        phase,
        transform,
        workspace,
      });

      /* We only verify if the transform asked for it and if the workspace has pending changes. */
      if (result && workspace.tree.isDirty()) {
        await this._applyChanges({ workspace, phase });

        const verifyActivity = phase.createActivityStep('Verifying');
        const verifyResult = await result.verify({
          activityStep: verifyActivity,
        });

        if (verifyResult) {
          verifyActivity.fail('failed');
          const rollbackActivity = phase.createActivityStep('Rolling back');
          await verifyResult.rollback({ activityStep: rollbackActivity });
        } else {
          verifyActivity.done('verified');
        }
      }
    }

    await this._applyChanges({ workspace, phase });

    const reviewTimeSaved = this._changesTotalCount * 0.1;
    const savings = this._changesTotalCount * 0.5;
    if (savings > 10) {
      phase
        .createActivityStep('💰 LLM budget saved')
        .done(`~$${savings.toFixed(2)}`);
      phase
        .createActivityStep('⏱️ Review time saved')
        .done(`~${Number(reviewTimeSaved.toFixed(1))} hour(s)`);
    }

    phase.done();
  }

  private async _applyTransform({
    phase,
    transform,
    workspace,
  }: {
    phase: TransformingPhase;
    transform: Transform;
    workspace: Workspace;
  }): Promise<void | TransformResult> {
    const transformStep = phase.createTransformStep({ name: transform.name });

    try {
      const result = await transform.apply({
        workspace,
        commandRunner: this._commandRunner,
        progressStep: transformStep,
      });
      transformStep.done();
      return result;
    } catch (error) {
      transformStep.fail(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async _applyChanges({
    phase,
    workspace,
  }: {
    phase: TransformingPhase;
    workspace: Workspace;
  }): Promise<void> {
    const applyChangesActivity = phase.createActivityStep('Applying changes');
    const { count } = await workspace.tree.commit();
    this._changesTotalCount += count;
    applyChangesActivity.done(`applied ${count} changes`);

    for (const command of workspace.commands.drain()) {
      const activity = phase.createActivityStep(command.join(' '));

      try {
        await this._commandRunner.run(command);
        activity.done('succeeded');
      } catch (error) {
        activity.fail(error instanceof Error ? error.message : String(error));
      }
    }
  }
}
