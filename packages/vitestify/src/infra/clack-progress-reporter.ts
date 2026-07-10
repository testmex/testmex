import type { ProgressReporter } from '../core/ports/progress-reporter';

/**
 * @deprecated 🚧 work in progress
 */
export class ClackProgressReporter implements ProgressReporter {
  createSpinner() {
    throw new Error('🚧 work in progress');
  }
}
