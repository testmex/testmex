import { type Subscription } from 'rxjs';
import { throttleProgressSnapshot } from '../core/domain/throttle-progress-snapshot';
import { ProgressTracker } from '../core/models/progress-tracker';
import type { ProgressListener } from '../core/ports/progress-listener';
import { TerminalProgressListener } from './terminal-progress-listener';

/**
 * @deprecated 🚧 Work in progress.
 */
export function wireTerminalProgressListener(
  tracker: ProgressTracker,
  listener: ProgressListener = new TerminalProgressListener(),
  throttleDuration = 100,
): Subscription {
  return tracker.snapshot$
    .pipe(throttleProgressSnapshot(throttleDuration))
    .subscribe((snapshot) => listener.notify(snapshot));
}
