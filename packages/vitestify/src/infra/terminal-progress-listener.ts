import type { ProgressListener } from '../core/ports/progress-listener';
import type { ProgressTracker, Unsubscribe } from '../core/models/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export class TerminalProgressListener implements ProgressListener {
  attach(_tracker: ProgressTracker): Unsubscribe {
    throw new Error('🚧 work in progress');
  }
}
