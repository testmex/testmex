import type { ProgressSnapshot } from '../models/progress-tracker';

export interface ProgressListener {
  notify(snapshot: ProgressSnapshot): void;
}
