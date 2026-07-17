import type { ProgressSnapshot } from '../models/progress-snapshot';

export type Unsubscribe = () => void;

export type NumberedStepArgs = { stepNumber: number; stepCount: number };

/**
 * @deprecated 🚧 work in progress
 */
export class ProgressTracker {
  beginScanning(_args: { estimatedTotalSteps: number }): ScanningPhase {
    throw new Error('🚧 work in progress');
  }

  beginAnalysis(_args: { estimatedTotalSteps: number }): AnalysisPhase {
    throw new Error('🚧 work in progress');
  }

  beginTransforming(_args: { estimatedTotalSteps: number }): TransformingPhase {
    throw new Error('🚧 work in progress');
  }

  snapshot(): ProgressSnapshot {
    throw new Error('🚧 work in progress');
  }

  subscribe(_listener: (snapshot: ProgressSnapshot) => void): Unsubscribe {
    throw new Error('🚧 work in progress');
  }
}

export interface ScanningPhase {
  createEnricherStep(args: NumberedStepArgs & { name: string }): EnricherStep;
  done(message?: string): void;
}

export interface AnalysisPhase {
  createHeuristicStep(args: NumberedStepArgs & { name: string }): HeuristicStep;
  done(message?: string): void;
}

export interface TransformingPhase {
  createTransformStep(args: NumberedStepArgs & { name: string }): TransformStep;
  createActivityStep(): ActivityStep;
  done(message?: string): void;
}

export interface EnricherStep {
  setFilesDetected(count: number): void;
  createActivityStep(message: string): ActivityStep;
  done(message?: string): void;
  fail(message?: string): void;
}

export interface ActivityStep {
  updateMessage(message: string): void;
  done(message?: string): void;
  fail(message?: string): void;
}

export interface HeuristicStep {
  updateMessage(message: string): void;
  done(message?: string): void;
  fail(message?: string): void;
}

export interface TransformStep {
  updateMessage(message: string): void;
  setTransformedFileCount(count: number): void;
  createChildTransform(
    args: NumberedStepArgs & { name: string },
  ): TransformStep;
  done(message?: string): void;
  fail(message?: string): void;
}
