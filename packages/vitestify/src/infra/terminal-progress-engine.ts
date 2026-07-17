import type {
  ActivityStepSnapshot,
  EnricherStepSnapshot,
  ProgressSnapshot,
  TransformStepSnapshot,
} from '../core/models/progress-tracker';

export type StepPath = readonly number[];

export type TerminalProgressInstruction =
  | { kind: 'intro'; message: string }
  | { kind: 'outro'; message: string }
  | { kind: 'spinnerStart'; path: StepPath; message: string }
  | { kind: 'spinnerMessage'; path: StepPath; message: string }
  | { kind: 'spinnerStop'; path: StepPath; message: string }
  | { kind: 'spinnerError'; path: StepPath; message: string };

/**
 * @deprecated 🚧 work in progress
 */
export class TerminalProgressEngine {
  diff(
    _previous: ProgressSnapshot | null,
    _next: ProgressSnapshot,
  ): TerminalProgressInstruction[] {
    throw new Error('🚧 work in progress');
  }
}

/**
 * @deprecated 🚧 work in progress
 */
export function formatStepDisplay(
  _step:
    | EnricherStepSnapshot
    | TransformStepSnapshot
    | ActivityStepSnapshot,
  _args: {
    stepNumber?: number;
    stepCount?: number;
  } = {},
): string {
  throw new Error('🚧 work in progress');
}
