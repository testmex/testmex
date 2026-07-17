export type ProgressStatus = 'started' | 'done' | 'failed';

export type Unsubscribe = () => void;

export interface SnapshotBase {
  readonly status: ProgressStatus;
  readonly statusMessage?: string;
}

export interface ProgressSnapshot {
  readonly phases: readonly PhaseSnapshot[];
}

export type PhaseSnapshot =
  | ScanningPhaseSnapshot
  | AnalysisPhaseSnapshot
  | TransformingPhaseSnapshot;

export interface PhaseSnapshotBase extends SnapshotBase {
  readonly estimatedTotalSteps: number;
}

export interface ScanningPhaseSnapshot extends PhaseSnapshotBase {
  readonly kind: 'scanning';
  readonly steps: readonly EnricherStepSnapshot[];
}

export interface AnalysisPhaseSnapshot extends PhaseSnapshotBase {
  readonly kind: 'analysis';
  readonly steps: readonly HeuristicStepSnapshot[];
}

export interface TransformingPhaseSnapshot extends PhaseSnapshotBase {
  readonly kind: 'transforming';
  readonly steps: readonly (TransformStepSnapshot | ActivityStepSnapshot)[];
}

export interface StepSnapshotBase extends SnapshotBase {
  readonly stepNumber?: number;
  readonly stepCount?: number;
}

export interface EnricherStepSnapshot extends StepSnapshotBase {
  readonly kind: 'enricher';
  readonly name: string;
  readonly detectedFileCount: number;
  readonly activities: readonly ActivityStepSnapshot[];
}

export interface ActivityStepSnapshot extends SnapshotBase {
  readonly kind: 'activity';
  readonly message: string;
}

export interface HeuristicStepSnapshot extends StepSnapshotBase {
  readonly kind: 'heuristic';
  readonly name: string;
}

export interface TransformStepSnapshot extends StepSnapshotBase {
  readonly kind: 'transform';
  readonly name: string;
  readonly transformedFileCount: number;
  readonly childTransforms: readonly TransformStepSnapshot[];
}

export type NumberedStepArgs = { stepNumber: number; stepCount: number };

export interface ProgressTracker {
  beginScanning(args: { estimatedTotalSteps: number }): ScanningPhase;
  beginAnalysis(args: { estimatedTotalSteps: number }): AnalysisPhase;
  beginTransforming(args: { estimatedTotalSteps: number }): TransformingPhase;
  snapshot(): ProgressSnapshot;
  subscribe(listener: (snapshot: ProgressSnapshot) => void): Unsubscribe;
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
