export interface LegacyProgressReporter {
  createPhase(title: string): LegacyPhase;
}

export interface LegacyPhase {
  createStep(args: LegacyStepArgs): LegacyStep;
  done(): void;
}

export type LegacyStepArgs =
  | { name: string }
  | { name: string; stepNumber: number; stepCount: number };

export interface LegacyStep {
  createSubStep(message: string): LegacySubStep;
  updateMessage(message: string): void;
  done(message: string): void;
  error(message: string): void;
}

export interface LegacySubStep {
  updateMessage(message: string): void;
}

export const LEGACY_NO_OP_PHASE: LegacyPhase = {
  createStep: () => LEGACY_NO_OP_STEP,
  done: () => undefined,
};

export const LEGACY_NO_OP_STEP: LegacyStep = {
  createSubStep: () => LEGACY_NO_OP_SUB_STEP,
  updateMessage: () => undefined,
  done: () => undefined,
  error: () => undefined,
};

export const LEGACY_NO_OP_SUB_STEP: LegacySubStep = {
  updateMessage: () => undefined,
};
