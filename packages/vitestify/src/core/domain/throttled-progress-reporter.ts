import { Subject, throttleTime } from 'rxjs';
import type { ProgressReporter, Step, StepArgs } from '../ports/progress-reporter';

export class ThrottledProgressReporter implements ProgressReporter {
  private readonly _duration: number;

  constructor(
    private readonly _inner: ProgressReporter,
    options: { duration?: number } = {},
  ) {
    this._duration = options.duration ?? 100;
  }

  createStep(args: StepArgs): Step {
    const innerProgressStep = this._inner.createStep(args);
    const messages$ = new Subject<string>();

    const subscription = messages$
      .pipe(
        throttleTime(this._duration, undefined, {
          leading: true,
          trailing: true,
        }),
      )
      .subscribe((body) => {
        innerProgressStep.message(body);
      });

    return {
      message: (body: string) => {
        messages$.next(body);
      },
      done: (body?: string) => {
        subscription.unsubscribe();
        innerProgressStep.done(body);
      },
      error: (body: string) => {
        subscription.unsubscribe();
        innerProgressStep.error(body);
      },
    };
  }
}
