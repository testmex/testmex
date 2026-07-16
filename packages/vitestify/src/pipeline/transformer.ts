import type { Workspace } from '../core/domain/workspace';
import type { Transform } from '../core/models/transform';
import type { CommandRunner } from '../core/ports/command-runner';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type {
  Phase,
  ProgressReporter,
  Step,
} from '../core/ports/progress-reporter';

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
      await this._applyTransform({
        phase,
        stepCount,
        stepNumber: index + 1,
        transform,
        workspace,
      });
    }

    const progressStep = phase.createStep({ name: 'Applying changes' });

    await this._applyChanges(workspace, progressStep);

    progressStep?.done('done');

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
  }): Promise<void> {
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
        onProgress: (detail) => {
          lastMessageDetail = detail;
          progressStep.updateMessage(
            this._concatMessages(['transforming', detail]),
          );
        },
      });

      if (result) {
        await this._applyChanges(workspace, progressStep);
        const verifyResult = await result.verify();
        await verifyResult?.rollback();
      }

      progressStep.done(
        this._concatMessages(
          lastMessageDetail === undefined
            ? ['transformed']
            : ['transformed', lastMessageDetail],
        ),
      );
    } catch (error) {
      progressStep.error(
        this._concatMessages([
          'failed',
          error instanceof Error ? error.message : String(error),
        ]),
      );
    }
  }

  private async _applyChanges(
    workspace: Workspace,
    progressStep: Step,
  ): Promise<void> {
    const commitSubStep = progressStep.createSubStep(
      'applying file system changes',
    );
    const { count } = await workspace.tree.commit();
    commitSubStep?.updateMessage(`applied ${count} file system changes`);

    for (const command of workspace.commands.drain()) {
      const commandString = command.join(' ');
      const subStepLabel = `command: ${commandString}`;
      const subStep = progressStep.createSubStep(subStepLabel);

      subStep?.updateMessage(this._concatMessages([subStepLabel, 'running']));

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
  }

  private _concatMessages(messages: string[]) {
    return messages.join(' · ');
  }
}
