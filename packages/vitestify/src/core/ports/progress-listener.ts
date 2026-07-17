import type {
  ProgressTracker,
  Unsubscribe,
} from '../models/progress-tracker';

export interface ProgressListener {
  attach(tracker: ProgressTracker): Unsubscribe;
}
