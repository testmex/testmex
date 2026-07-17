export type ProgressStatus = 'started' | 'done' | 'failed';

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
