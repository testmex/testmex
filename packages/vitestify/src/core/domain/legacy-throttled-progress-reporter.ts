import { Subscription, Subject, throttleTime } from 'rxjs';
import type {
  LegacyPhase,
  LegacyProgressReporter,
  LegacyStep,
  LegacySubStep,
} from '../ports/legacy-progress-reporter';

/**
 * @deprecated 🚧 work in progress — legacy `LegacyProgressReporter` decorator; replaced by
 * `throttleProgressSnapshot` on `ProgressTracker.snapshot$`. Kept until PR#4 removes
 * the old reporter port.
 */
export class LegacyThrottledProgressReporter implements LegacyProgressReporter {
  private readonly _duration: number;

  constructor(
    private readonly _inner: LegacyProgressReporter,
    options: { duration?: number } = {},
  ) {
    this._duration = options.duration ?? 100;
  }

  createPhase(title: string): LegacyPhase {
    const innerPhase = this._inner.createPhase(title);

    return {
      ...innerPhase,
      createStep: (args) => this._wrapStep(innerPhase.createStep(args)),
    };
  }

  private _wrapStep(inner: LegacyStep): LegacyStep {
    const subscription = new Subscription();

    return {
      createSubStep: (message: string): LegacySubStep => {
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
