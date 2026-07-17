import type { ProgressListener } from '../core/ports/progress-listener';
import type {
  ActivityStepSnapshot,
  EnricherStepSnapshot,
  ProgressTracker,
  TransformStepSnapshot,
  Unsubscribe,
} from '../core/models/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export class TerminalProgressListener implements ProgressListener {
  attach(_tracker: ProgressTracker): Unsubscribe {
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
