import type { ProgressListener } from '../ports/progress-listener';
import type { ProgressTracker, Unsubscribe } from '../models/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export class ThrottledProgressListener implements ProgressListener {
  constructor(
    private readonly _inner: ProgressListener,
    _options: { duration?: number } = {},
  ) {}

  attach(_tracker: ProgressTracker): Unsubscribe {
    throw new Error('🚧 work in progress');
  }
}
