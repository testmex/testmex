import type {
  ActivityStepSnapshot,
  AnalysisPhaseSnapshot,
  EnricherStepSnapshot,
  PhaseSnapshot,
  ProgressSnapshot,
  ScanningPhaseSnapshot,
  TransformingPhaseSnapshot,
  TransformStepSnapshot,
} from '../core/models/progress-tracker';

export type TerminalProgressInstruction =
  | { kind: 'intro'; message: string }
  | { kind: 'outro'; message: string }
  | { kind: 'spinnerStart'; message: string }
  | { kind: 'spinnerMessage'; message: string }
  | { kind: 'spinnerStop'; message: string }
  | { kind: 'spinnerError'; message: string };

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

    return [
      ...this._computePhaseStatusInstructions(previous, next),
      ...this._computePhaseStepsInstructions(previous, next),
    ];
  }

  private _computePhaseStatusInstructions(
    previous: PhaseSnapshot | undefined,
    next: PhaseSnapshot,
  ): TerminalProgressInstruction[] {
    if (previous === undefined) {
      return this._computeIntroPhaseInstructions(next);
    }

    const instructions: TerminalProgressInstruction[] = [];

    if (previous.status !== 'done' && next.status === 'done') {
      instructions.push({
        kind: 'outro',
        message: `${this._phaseTitle(next)} finished`,
      });
    }

    if (previous.status !== 'failed' && next.status === 'failed') {
      instructions.push({
        kind: 'outro',
        message: `${this._phaseTitle(next)} finished`,
      });
    }

    return instructions;
  }

  private _computeIntroPhaseInstructions(
    phase: PhaseSnapshot,
  ): TerminalProgressInstruction[] {
    if (phase.status !== 'started') {
      return [];
    }

    return [{ kind: 'intro', message: `${this._phaseTitle(phase)} started` }];
  }

  private _computePhaseStepsInstructions(
    previous: PhaseSnapshot | undefined,
    next: PhaseSnapshot,
  ): TerminalProgressInstruction[] {
    switch (next.kind) {
      case 'scanning':
        return this._computeScanningStepsInstructions(
          previous?.kind === 'scanning' ? previous : undefined,
          next,
        );
      case 'analysis':
        return this._computeAnalysisStepsInstructions(
          previous?.kind === 'analysis' ? previous : undefined,
          next,
        );
      case 'transforming':
        return this._computeTransformingStepsInstructions(
          previous?.kind === 'transforming' ? previous : undefined,
          next,
        );
    }
  }

  private _computeScanningStepsInstructions(
    previous: ScanningPhaseSnapshot | undefined,
    next: ScanningPhaseSnapshot,
  ): TerminalProgressInstruction[] {
    const instructions: TerminalProgressInstruction[] = [];
    const prevSteps = previous?.steps ?? [];

    for (let stepIndex = 0; stepIndex < next.steps.length; stepIndex++) {
      const nextStep = next.steps[stepIndex];
      const prevStep = prevSteps[stepIndex];

      if (prevStep === nextStep) {
        continue;
      }

      instructions.push(
        ...this._computeStepSpinnerInstructions({
          previous: prevStep,
          next: nextStep,
          format: (step) => step.name,
          hasDisplayChange: this._enricherDisplayChanged,
        }),
      );
    }

    return instructions;
  }

  private _computeAnalysisStepsInstructions(
    previous: AnalysisPhaseSnapshot | undefined,
    next: AnalysisPhaseSnapshot,
  ): TerminalProgressInstruction[] {
    const instructions: TerminalProgressInstruction[] = [];
    const prevSteps = previous?.steps ?? [];

    for (let stepIndex = 0; stepIndex < next.steps.length; stepIndex++) {
      const nextStep = next.steps[stepIndex];
      const prevStep = prevSteps[stepIndex];

      if (prevStep === nextStep) {
        continue;
      }

      instructions.push(
        ...this._computeStepSpinnerInstructions({
          previous: prevStep,
          next: nextStep,
          format: (step) => step.name,
        }),
      );
    }

    return instructions;
  }

  private _computeTransformingStepsInstructions(
    previous: TransformingPhaseSnapshot | undefined,
    next: TransformingPhaseSnapshot,
  ): TerminalProgressInstruction[] {
    const instructions: TerminalProgressInstruction[] = [];
    const prevSteps = previous?.steps ?? [];

    for (let stepIndex = 0; stepIndex < next.steps.length; stepIndex++) {
      const nextStep = next.steps[stepIndex];
      const prevStep = prevSteps[stepIndex];

      if (prevStep === nextStep) {
        continue;
      }

      if (nextStep.kind === 'activity') {
        instructions.push(
          ...this._computeStepSpinnerInstructions({
            previous: prevStep?.kind === 'activity' ? prevStep : undefined,
            next: nextStep,
            format: (step) => step.message,
          }),
        );
        continue;
      }

      if (nextStep.kind === 'transform') {
        instructions.push(
          ...this._computeStepSpinnerInstructions({
            previous: prevStep?.kind === 'transform' ? prevStep : undefined,
            next: nextStep,
            format: (step) => step.name,
            hasDisplayChange: this._transformDisplayChanged,
          }),
        );
      }
    }

    return instructions;
  }

  private _computeStepSpinnerInstructions<
    T extends { readonly status: string },
  >(args: {
    previous: T | undefined;
    next: T;
    format: (step: T) => string;
    hasDisplayChange?: (previous: T, next: T) => boolean;
  }): TerminalProgressInstruction[] {
    const { previous, next, format, hasDisplayChange = () => true } = args;

    if (previous === next) {
      return [];
    }

    if (previous === undefined) {
      if (next.status === 'started') {
        return [{ kind: 'spinnerStart', message: format(next) }];
      }

      return [];
    }

    if (previous.status === 'started' && next.status === 'done') {
      return [{ kind: 'spinnerStop', message: format(next) }];
    }

    if (previous.status === 'started' && next.status === 'failed') {
      return [{ kind: 'spinnerError', message: format(next) }];
    }

    if (previous.status === 'started' && next.status === 'started') {
      if (hasDisplayChange(previous, next)) {
        return [{ kind: 'spinnerMessage', message: format(next) }];
      }
    }

    return [];
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

  private _enricherDisplayChanged(
    previous: EnricherStepSnapshot,
    next: EnricherStepSnapshot,
  ): boolean {
    return (
      previous.name !== next.name ||
      previous.statusMessage !== next.statusMessage ||
      previous.activities !== next.activities
    );
  }

  private _transformDisplayChanged(
    previous: TransformStepSnapshot,
    next: TransformStepSnapshot,
  ): boolean {
    return (
      previous.name !== next.name ||
      previous.statusMessage !== next.statusMessage ||
      previous.childTransforms !== next.childTransforms
    );
  }
}

/**
 * @deprecated 🚧 work in progress
 */
export function formatStepDisplay(
  _step: EnricherStepSnapshot | TransformStepSnapshot | ActivityStepSnapshot,
  _args: {
    stepNumber?: number;
    stepCount?: number;
  } = {},
): string {
  throw new Error('🚧 work in progress');
}
