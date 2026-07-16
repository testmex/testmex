import { Subscription, Subject, throttleTime } from 'rxjs';
import type {
  Phase,
  ProgressReporter,
  Step,
  SubStep,
} from '../ports/progress-reporter';

export class ThrottledProgressReporter implements ProgressReporter {
  private readonly _duration: number;

  constructor(
    private readonly _inner: ProgressReporter,
    options: { duration?: number } = {},
  ) {
    this._duration = options.duration ?? 100;
  }

  createPhase(title: string): Phase {
    const innerPhase = this._inner.createPhase(title);

    return {
      ...innerPhase,
      createStep: (args) => this._wrapStep(innerPhase.createStep(args)),
    };
  }

  private _wrapStep(inner: Step): Step {
    const subscription = new Subscription();

    return {
      createSubStep: (message: string): SubStep => {
        const innerSubStep = inner.createSubStep(message);

        return {
          updateMessage: this._throttledUpdateMessage(
            (body) => innerSubStep.updateMessage(body),
            subscription,
          ),
        };
      },
      updateMessage: this._throttledUpdateMessage(
        (body) => inner.updateMessage(body),
        subscription,
      ),
      done: (body: string) => {
        subscription.unsubscribe();
        inner.done(body);
      },
      error: (body: string) => {
        subscription.unsubscribe();
        inner.error(body);
      },
    };
  }

  private _throttledUpdateMessage(
    updateMessage: (body: string) => void,
    subscription: Subscription,
  ): (body: string) => void {
    const messages$ = new Subject<string>();

    subscription.add(
      messages$
        .pipe(
          throttleTime(this._duration, undefined, {
            leading: true,
            trailing: true,
          }),
        )
        .subscribe((body) => {
          updateMessage(body);
        }),
    );

    return (body: string) => {
      messages$.next(body);
    };
  }
}
