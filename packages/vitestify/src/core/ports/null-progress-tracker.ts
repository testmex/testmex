import type {
  ActivityStep,
  AnalysisPhase,
  EnricherStep,
  HeuristicStep,
  ProgressSnapshot,
  ProgressTracker,
  ScanningPhase,
  TransformingPhase,
  TransformStep,
  Unsubscribe,
} from './progress-tracker';

const NO_OP_ACTIVITY_STEP: ActivityStep = {
  updateMessage: () => undefined,
  done: () => undefined,
  fail: () => undefined,
};

const NO_OP_ENRICHER_STEP: EnricherStep = {
  setFilesDetected: () => undefined,
  createActivityStep: () => NO_OP_ACTIVITY_STEP,
  done: () => undefined,
  fail: () => undefined,
};

const NO_OP_HEURISTIC_STEP: HeuristicStep = {
  updateMessage: () => undefined,
  done: () => undefined,
  fail: () => undefined,
};

const NO_OP_TRANSFORM_STEP: TransformStep = {
  updateMessage: () => undefined,
  setTransformedFileCount: () => undefined,
  createChildTransform: () => NO_OP_TRANSFORM_STEP,
  done: () => undefined,
  fail: () => undefined,
};

const NO_OP_SCANNING_PHASE: ScanningPhase = {
  createEnricherStep: () => NO_OP_ENRICHER_STEP,
  done: () => undefined,
};

const NO_OP_ANALYSIS_PHASE: AnalysisPhase = {
  createHeuristicStep: () => NO_OP_HEURISTIC_STEP,
  done: () => undefined,
};

const NO_OP_TRANSFORMING_PHASE: TransformingPhase = {
  createTransformStep: () => NO_OP_TRANSFORM_STEP,
  createActivityStep: () => NO_OP_ACTIVITY_STEP,
  done: () => undefined,
};

const EMPTY_SNAPSHOT: ProgressSnapshot = { phases: [] };

export class NullProgressTracker implements ProgressTracker {
  beginScanning() {
    return NO_OP_SCANNING_PHASE;
  }

  beginAnalysis() {
    return NO_OP_ANALYSIS_PHASE;
  }

  beginTransforming() {
    return NO_OP_TRANSFORMING_PHASE;
  }

  snapshot() {
    return EMPTY_SNAPSHOT;
  }

  subscribe(): Unsubscribe {
    return () => undefined;
  }
}
