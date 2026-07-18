import type { ProgressListener } from '../ports/progress-listener';
import type { ProgressSnapshot } from '../models/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export class ThrottledProgressListener implements ProgressListener {
  constructor(
    private readonly _inner: ProgressListener,
    _options: { duration?: number } = {},
  ) {}

  notify(_snapshot: ProgressSnapshot): void {
    throw new Error('🚧 work in progress');
  }
}
