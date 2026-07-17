import { ThrottledProgressListener } from '../core/domain/throttled-progress-listener';
import { ProgressTracker } from '../core/models/progress-tracker';
import { TerminalProgressListener } from './terminal-progress-listener';

/**
 * @deprecated 🚧 work in progress
 */
export function wireTerminalProgressListener(): {
  tracker: ProgressTracker;
  listener: ThrottledProgressListener;
} {
  throw new Error('🚧 work in progress');
}
