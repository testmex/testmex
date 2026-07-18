import type { ProgressListener } from '../core/ports/progress-listener';
import type { ProgressSnapshot } from '../core/models/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export class TerminalProgressListener implements ProgressListener {
  notify(_snapshot: ProgressSnapshot): void {
    throw new Error('🚧 work in progress');
  }
}
