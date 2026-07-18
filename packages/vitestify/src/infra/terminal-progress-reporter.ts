import type { ProgressReporter } from '../core/ports/progress-reporter';
import type { ProgressSnapshot } from '../core/models/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export class TerminalProgressReporter implements ProgressReporter {
  notify(_snapshot: ProgressSnapshot): void {
    throw new Error('🚧 work in progress');
  }
}
