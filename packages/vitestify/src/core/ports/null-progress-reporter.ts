import { NO_OP_STEP, type ProgressReporter } from './progress-reporter';

export class NullProgressReporter implements ProgressReporter {
  createStep() {
    return NO_OP_STEP;
  }
}
