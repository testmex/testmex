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
} from '../ports/progress-tracker';

/**
 * @deprecated 🚧 work in progress
 */
export class InMemoryProgressTracker implements ProgressTracker {
  beginScanning(): ScanningPhase {
    throw new Error('🚧 work in progress');
  }

  beginAnalysis(): AnalysisPhase {
    throw new Error('🚧 work in progress');
  }

  beginTransforming(): TransformingPhase {
    throw new Error('🚧 work in progress');
  }

  snapshot(): ProgressSnapshot {
    throw new Error('🚧 work in progress');
  }

  subscribe(): Unsubscribe {
    throw new Error('🚧 work in progress');
  }
}
