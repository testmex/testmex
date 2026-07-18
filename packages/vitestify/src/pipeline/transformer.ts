import type { Workspace } from '../core/domain/workspace';
import type { Transform, TransformResult } from '../core/models/transform';
import type { CommandRunner } from '../core/ports/command-runner';
import { LegacyNullProgressReporter } from '../core/ports/legacy-null-progress-reporter';
import type {
  LegacyPhase,
  LegacyProgressReporter,
} from '../core/ports/legacy-progress-reporter';
export class Transformer {
  private readonly _commandRunner: CommandRunner;
  private readonly _legacyProgressReporter: LegacyProgressReporter;
  private readonly _transforms: Transform[];

  private _changesTotalCount = 0;

  constructor({
    commandRunner,
    transforms,
    legacyProgressReporter = new LegacyNullProgressReporter(),
  }: {
    commandRunner: CommandRunner;
    transforms: Transform[];
    legacyProgressReporter?: LegacyProgressReporter;
  }) {
    this._commandRunner = commandRunner;
    this._legacyProgressReporter = legacyProgressReporter;
    this._transforms = transforms;
  }

  async transform(workspace: Workspace): Promise<void> {
    const stepCount = this._transforms.length;
    const phase = this._legacyProgressReporter.createPhase('Transforming');

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

    const reviewTimeSaved = this._changesTotalCount * 0.1;
    const savings = this._changesTotalCount * 0.5;
    if (savings > 10) {
      phase
        .createStep({ name: '💰 LLM budget saved' })
        .done(`~$${savings.toFixed(2)}`);
      phase
        .createStep({ name: '⏱️ Review time saved' })
        .done(`~${Number(reviewTimeSaved.toFixed(1))} hour(s)`);
    }

    phase.done();
  }

  private async _applyTransform({
    phase,
    stepCount,
    stepNumber,
    transform,
    workspace,
  }: {
    phase: LegacyPhase;
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
    phase: LegacyPhase;
    workspace: Workspace;
  }): Promise<void> {
    const progressStep = phase.createStep({ name: 'Applying changes' });
    const commitSubStep = progressStep.createSubStep('applying changes');
    const { count } = await workspace.tree.commit();
    this._changesTotalCount += count;
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
