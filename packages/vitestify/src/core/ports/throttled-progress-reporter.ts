import type { ProgressReporter } from './progress-reporter';

export interface ThrottledProgressReporterOptions {
  intervalMs?: number;
}

/**
 * @deprecated 🚧 work in progress
 */
export class ThrottledProgressReporter implements ProgressReporter {
  constructor(
    private readonly _inner: ProgressReporter,
    _options: ThrottledProgressReporterOptions = {},
  ) {}

  createSpinner() {
    throw new Error('🚧 work in progress');
  }
}
