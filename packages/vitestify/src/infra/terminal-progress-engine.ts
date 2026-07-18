import type {
  ActivityStepSnapshot,
  EnricherStepSnapshot,
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

/**
 * @deprecated 🚧 work in progress
 */
export class TerminalProgressEngine {
  computeInstructions(
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
  _step: EnricherStepSnapshot | TransformStepSnapshot | ActivityStepSnapshot,
  _args: {
    stepNumber?: number;
    stepCount?: number;
  } = {},
): string {
  throw new Error('🚧 work in progress');
}
