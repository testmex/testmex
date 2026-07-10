import type { ProgressReporter, ProgressSpinner } from './progress-reporter';

/**
 * @deprecated 🚧 work in progress
 */
export class ProgressReporterFake implements ProgressReporter {
  createSpinner(): ProgressSpinner {
    throw new Error('🚧 work in progress');
  }
}
