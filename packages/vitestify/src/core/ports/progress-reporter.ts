import type { ProgressSnapshot } from '../models/progress-tracker';

export interface ProgressReporter {
  notify(snapshot: ProgressSnapshot): void;
}
