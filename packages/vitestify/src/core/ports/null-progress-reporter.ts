import type { ProgressReporter, ProgressSpinner } from './progress-reporter';

export class NullProgressReporter implements ProgressReporter {
  createSpinner(): ProgressSpinner {
    return {
      message: () => undefined,
      done: () => undefined,
      error: () => undefined,
    };
  }
}
