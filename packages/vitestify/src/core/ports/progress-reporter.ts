export interface ProgressReporter {
  createPhase(title: string): Phase;
}

export interface Phase {
  createStep(args: StepArgs): Step;
  done(): void;
}

export type StepArgs =
  | { name: string }
  | { name: string; stepNumber: number; stepCount: number };

export interface Step {
  createSubStep(message: string): SubStep;
  updateMessage(message: string): void;
  done(message: string): void;
  error(message: string): void;
}

export interface SubStep {
  updateMessage(message: string): void;
}

export const NO_OP_PHASE: Phase = {
  createStep: () => NO_OP_STEP,
  done: () => undefined,
};

export const NO_OP_STEP: Step = {
  createSubStep: () => NO_OP_SUB_STEP,
  updateMessage: () => undefined,
  done: () => undefined,
  error: () => undefined,
};

export const NO_OP_SUB_STEP: SubStep = {
  updateMessage: () => undefined,
};
