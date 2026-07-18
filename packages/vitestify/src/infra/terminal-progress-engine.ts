import type {
  ActivityStepSnapshot,
  EnricherStepSnapshot,
  HeuristicStepSnapshot,
  PhaseSnapshot,
  ProgressSnapshot,
  TransformStepSnapshot,
} from '../core/models/progress-tracker';

export type TerminalProgressInstruction =
  | { kind: 'intro'; message: string }
  | { kind: 'outro'; message: string }
  | { kind: 'spinnerStart'; message: string }
  | { kind: 'spinnerMessage'; message: string }
  | { kind: 'spinnerStop'; message: string }
  | { kind: 'spinnerError'; message: string };

type StepSnapshot =
  | ActivityStepSnapshot
  | EnricherStepSnapshot
  | HeuristicStepSnapshot
  | TransformStepSnapshot;

export class TerminalProgressEngine {
  computeInstructions(
    previous: ProgressSnapshot | null,
    current: ProgressSnapshot,
  ): TerminalProgressInstruction[] {
    const prevPhases = previous?.phases ?? [];
    const phases = current.phases;

    if (phases.length === 0) {
      return [];
    }

    /* New phase. */
    if (prevPhases.length !== phases.length) {
      return [
        /* Update the last phase.*/
        ...this._computePhaseInstructions(prevPhases.at(-1), phases.at(-2)),
        /* Add the new phase. */
        ...this._computePhaseInstructions(undefined, phases.at(-1)),
      ];
    } else {
      return this._computePhaseInstructions(prevPhases.at(-1), phases.at(-1));
    }
  }

  private _computePhaseInstructions(
    previous: PhaseSnapshot | undefined,
    next: PhaseSnapshot | undefined,
  ): TerminalProgressInstruction[] {
    /* Should not happen. */
    if (next === undefined) {
      return [];
    }

    const previousSteps: readonly StepSnapshot[] =
      previous?.kind === next.kind ? previous.steps : [];

    return [
      ...this._computePhaseStatusInstructions(previous, next),
      ...this._computeStepListInstructions(previousSteps, next.steps),
    ];
  }

  private _computePhaseStatusInstructions(
    previousPhase: PhaseSnapshot | undefined,
    phase: PhaseSnapshot,
  ): TerminalProgressInstruction[] {
    if (previousPhase === undefined && phase.status === 'started') {
      return [{ kind: 'intro', message: `${this._phaseTitle(phase)} started` }];
    }

    if (
      (previousPhase?.status !== phase.status && phase.status === 'done') ||
      phase.status === 'failed'
    ) {
      return [
        { kind: 'outro', message: `${this._phaseTitle(phase)} finished` },
      ];
    }

    return [];
  }

  private _computeStepListInstructions(
    previousSteps: readonly StepSnapshot[],
    steps: readonly StepSnapshot[],
  ): TerminalProgressInstruction[] {
    if (steps.length === 0) {
      return [];
    }

    if (previousSteps.length !== steps.length) {
      return [
        ...this._computeStepInstructions(previousSteps.at(-1), steps.at(-2)),
        ...this._computeStepInstructions(undefined, steps.at(-1)),
      ];
    }

    return this._computeStepInstructions(previousSteps.at(-1), steps.at(-1));
  }

  private _phaseTitle(phase: PhaseSnapshot): string {
    switch (phase.kind) {
      case 'scanning':
        return 'Scanning';
      case 'analysis':
        return 'Workspace analysis';
      case 'transforming':
        return 'Transforming';
    }
  }

  private _computeStepInstructions(
    previous: StepSnapshot | undefined,
    next: StepSnapshot | undefined,
  ): TerminalProgressInstruction[] {
    if (next === undefined) {
      return [];
    }

    if (previous != null && previous.kind !== next.kind) {
      throw new Error('Inconsistent progress snapshot');
    }

    return this._computeStepSpinnerInstructions(previous, next);
  }

  private _computeStepSpinnerInstructions(
    previous: StepSnapshot | undefined,
    next: StepSnapshot,
  ): TerminalProgressInstruction[] {
    if (previous === next) {
      return [];
    }

    if (previous == null || previous?.status !== next.status) {
      switch (next.status) {
        case 'started':
          return [
            { kind: 'spinnerStart', message: this._stepSpinnerMessage(next) },
          ];
        case 'done':
          return [
            { kind: 'spinnerStop', message: this._stepSpinnerMessage(next) },
          ];
        case 'failed':
          return [
            { kind: 'spinnerError', message: this._stepSpinnerMessage(next) },
          ];
      }
    }

    return [
      { kind: 'spinnerMessage', message: this._stepSpinnerMessage(next) },
    ];
  }

  private _stepSpinnerMessage(step: StepSnapshot): string {
    if (step.kind === 'heuristic') {
      return step.name;
    }

    return this._formatStepDisplay(step);
  }

  private _formatStepDisplay(
    step: EnricherStepSnapshot | TransformStepSnapshot | ActivityStepSnapshot,
    args: {
      stepNumber?: number;
      stepCount?: number;
    } = {},
  ): string {
    const prefix =
      args.stepNumber !== undefined && args.stepCount !== undefined
        ? `[${args.stepNumber}/${args.stepCount}] `
        : '';

    switch (step.kind) {
      case 'activity':
        return step.message;
      case 'enricher': {
        let formatted = `${prefix}${step.name}`;

        if (step.detectedFileCount > 0) {
          formatted += ` · ${step.detectedFileCount} file(s) detected`;
        }

        return formatted;
      }
      case 'transform':
        return `${prefix}${step.name}`;
    }
  }
}
