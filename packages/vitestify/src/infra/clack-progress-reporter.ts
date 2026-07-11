import { spinner } from '@clack/prompts';
import type {
  ProgressReporter,
  ProgressSpinner,
} from '../core/ports/progress-reporter';

export class ClackProgressReporter implements ProgressReporter {
  createSpinner(): ProgressSpinner {
    if (!process.stdout.isTTY) {
      return NO_OP_SPINNER;
    }

    const clackSpinner = spinner();
    let started = false;

    return {
      message: (message: string) => {
        if (!started) {
          clackSpinner.start(message);
          started = true;
          return;
        }

        clackSpinner.message(message);
      },
      done: (message?: string) => {
        if (!started) {
          return;
        }

        clackSpinner.stop(message);
      },
    };
  }
}

// TIDYUP: factor out in `progress-reporter.ts` and use it in NullProgressReporter
const NO_OP_SPINNER: ProgressSpinner = {
  message: () => undefined,
  done: () => undefined,
};
