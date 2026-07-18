import type { Subscription } from 'rxjs';
import { ThrottledProgressListener } from '../core/domain/throttled-progress-listener';
import { ProgressTracker } from '../core/models/progress-tracker';
import { TerminalProgressListener } from './terminal-progress-listener';

/**
 * @deprecated 🚧 work in progress
 */
export function wireTerminalProgressListener(): {
  tracker: ProgressTracker;
  subscription: Subscription;
} {
  throw new Error('🚧 work in progress');
}

export function subscribeTerminalProgressListener(
  tracker: ProgressTracker,
  listener = new ThrottledProgressListener(new TerminalProgressListener()),
): Subscription {
  return tracker.snapshot$.subscribe((snapshot) => listener.notify(snapshot));
}
