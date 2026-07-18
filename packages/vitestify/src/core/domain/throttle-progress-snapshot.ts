import type { MonoTypeOperatorFunction } from 'rxjs';
import type { ProgressSnapshot } from '../models/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export function throttleProgressSnapshot(
  _duration: number,
): MonoTypeOperatorFunction<ProgressSnapshot> {
  return () => {
    throw new Error('🚧 work in progress');
  };
}
