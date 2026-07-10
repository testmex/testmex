import { Subject, throttleTime } from 'rxjs';
import type { ProgressReporter, ProgressSpinner } from './progress-reporter';

// TIDYUP: inline
// TIDYUP: rename `intervalMs` to `duration`
export interface ThrottledProgressReporterOptions {
  intervalMs?: number;
}

/**
 * @deprecated 🚧 work in progress
 */
export class ThrottledProgressReporter implements ProgressReporter {
  private readonly _intervalMs: number;

  constructor(
    private readonly _inner: ProgressReporter,
    options: ThrottledProgressReporterOptions = {},
  ) {
    this._intervalMs = options.intervalMs ?? 100;
  }

  createSpinner(): ProgressSpinner {
    const innerSpinner = this._inner.createSpinner();
    const updates$ = new Subject<string>();

    updates$
      .pipe(
        throttleTime(this._intervalMs, undefined, {
          leading: true,
          trailing: true,
        }),
      )
      .subscribe((message) => {
        innerSpinner.update(message);
      });

    return {
      update: (message: string) => {
        updates$.next(message);
      },
      done: (message?: string) => {
        throw new Error('🚧 work in progress');
      },
    };
  }
}
