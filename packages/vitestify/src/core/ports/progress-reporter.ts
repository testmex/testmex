export type StepArgs =
  | { name: string }
  | { name: string; stepNumber: number; stepCount: number };

export interface Step {
  message(body: string): void;
  done(body?: string): void;
  error(body: string): void;
}

export interface ProgressReporter {
  createStep(args: StepArgs): Step;
}

export const NO_OP_STEP: Step = {
  message: () => undefined,
  done: () => undefined,
  error: () => undefined,
};
