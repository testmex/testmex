import { NO_OP_PHASE, type ProgressReporter } from './progress-reporter';

export class NullProgressReporter implements ProgressReporter {
  createPhase() {
    return NO_OP_PHASE;
  }
}
