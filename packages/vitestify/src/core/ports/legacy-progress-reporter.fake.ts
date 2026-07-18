import type {
  LegacyPhase,
  LegacyProgressReporter,
  LegacyStep,
  LegacyStepArgs,
  LegacySubStep,
} from './legacy-progress-reporter';

export class LegacyProgressReporterFake implements LegacyProgressReporter {
  private readonly _phases: MutablePhaseState[] = [];

  phases(): readonly PhaseState[] {
    return this._phases;
  }

  createPhase(title: string): LegacyPhase {
    const phase: MutablePhaseState = {
      title,
      steps: [],
      status: 'active',
    };
    this._phases.push(phase);

    return {
      createStep: (args) => this._createStep(phase, args),
      done: () => {
        phase.status = 'done';
      },
    };
  }

  private _createStep(phase: MutablePhaseState, args: LegacyStepArgs): LegacyStep {
    const step: MutableStepState = {
      name: args.name,
      status: 'active',
      message: '',
      subSteps: [],
      ...('stepNumber' in args
        ? { stepNumber: args.stepNumber, stepCount: args.stepCount }
        : {}),
    };
    phase.steps.push(step);

    const recordUpdate = (body: string) => {
      step.message = body;
    };

    return {
      createSubStep: (message: string): LegacySubStep => {
        const subStep: SubStepState = { message };
        step.subSteps.push(subStep);

        return {
          updateMessage: (body: string) => {
            subStep.message = body;
          },
        };
      },
      updateMessage: recordUpdate,
      done: (body: string) => {
        step.status = 'done';
        recordUpdate(body);
      },
      error: (body: string) => {
        step.status = 'error';
        step.error = body;
      },
    };
  }
}

export interface PhaseState {
  title: string;
  steps: readonly StepState[];
  status: Status;
}

export interface StepState {
  name: string;
  stepNumber?: number;
  stepCount?: number;
  status: Status;
  message: string;
  subSteps: readonly SubStepState[];
  error?: string;
}

export interface SubStepState {
  message: string;
}

interface MutablePhaseState {
  title: string;
  steps: MutableStepState[];
  status: Status;
}

interface MutableStepState {
  name: string;
  stepNumber?: number;
  stepCount?: number;
  status: Status;
  message: string;
  subSteps: SubStepState[];
  error?: string;
}

type Status = 'active' | 'done' | 'error';
