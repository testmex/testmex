import { Subject, throttleTime } from 'rxjs';
import type { ProgressReporter, ProgressSpinner } from './progress-reporter';

/**
 * @deprecated 🚧 work in progress
 */
export class ThrottledProgressReporter implements ProgressReporter {
  private readonly _duration: number;

  constructor(
    private readonly _inner: ProgressReporter,
    options: { duration?: number } = {},
  ) {
    this._duration = options.duration ?? 100;
  }

  createSpinner(): ProgressSpinner {
    const innerSpinner = this._inner.createSpinner();
    const updates$ = new Subject<string>();

    const subscription = updates$
      .pipe(
        throttleTime(this._duration, undefined, {
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
        subscription.unsubscribe();
        innerSpinner.done(message);
      },
    };
  }
}
