import {
  LEGACY_NO_OP_PHASE,
  type LegacyProgressReporter,
} from './legacy-progress-reporter';

export class LegacyNullProgressReporter implements LegacyProgressReporter {
  createPhase() {
    return LEGACY_NO_OP_PHASE;
  }
}
