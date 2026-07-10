import type { ProgressReporter, ProgressSpinner } from './progress-reporter';

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
    let pendingMessage: string | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    return {
      update: (message: string) => {
        if (timeoutId === undefined && pendingMessage === undefined) {
          innerSpinner.update(message);
          timeoutId = setTimeout(() => {
            if (pendingMessage !== undefined) {
              innerSpinner.update(pendingMessage);
              pendingMessage = undefined;
            }
            timeoutId = undefined;
          }, this._intervalMs);
          return;
        }

        pendingMessage = message;
      },
      done: (message?: string) => {
        throw new Error('🚧 work in progress');
      },
    };
  }
}
