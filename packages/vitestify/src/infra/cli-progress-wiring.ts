import { type Subscription } from 'rxjs';
import { throttleProgressSnapshot } from '../core/domain/throttle-progress-snapshot';
import { ProgressTracker } from '../core/models/progress-tracker';
import type { ProgressReporter } from '../core/ports/progress-reporter';
import { TerminalProgressReporter } from './terminal-progress-reporter';

/**
 * @deprecated 🚧 Work in progress.
 */
export function wireTerminalProgressReporter(
  tracker: ProgressTracker,
  progressReporter: ProgressReporter = new TerminalProgressReporter(),
  throttleDuration = 100,
): Subscription {
  return tracker.snapshot$
    .pipe(throttleProgressSnapshot(throttleDuration))
    .subscribe((snapshot) => progressReporter.notify(snapshot));
}
