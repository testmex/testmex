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
    const messages$ = new Subject<string>();

    const subscription = messages$
      .pipe(
        throttleTime(this._duration, undefined, {
          leading: true,
          trailing: true,
        }),
      )
      .subscribe((message) => {
        innerSpinner.message(message);
      });

    return {
      message: (message: string) => {
        messages$.next(message);
      },
      done: (message?: string) => {
        subscription.unsubscribe();
        innerSpinner.done(message);
      },
    };
  }
}
