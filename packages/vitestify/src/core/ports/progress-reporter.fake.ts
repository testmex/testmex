import type { ProgressReporter, ProgressSpinner } from './progress-reporter';

export class ProgressReporterFake implements ProgressReporter {
  private _message: string | undefined;

  createSpinner(): ProgressSpinner {
    return {
      update: (message: string) => {
        this._message = message;
      },
      done: (message?: string) => {
        if (message !== undefined) {
          this._message = message;
        }
      },
    };
  }

  message(): string | undefined {
    return this._message;
  }
}
