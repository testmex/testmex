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

export interface ScanningPhaseSnapshot extends SnapshotBase {
  readonly kind: 'scanning';
  readonly enricherCount: number;
  readonly steps: readonly EnricherStepSnapshot[];
}

export interface AnalysisPhaseSnapshot extends SnapshotBase {
  readonly kind: 'analysis';
  readonly heuristicsCount: number;
  readonly steps: readonly HeuristicStepSnapshot[];
}

export interface TransformingPhaseSnapshot extends SnapshotBase {
  readonly kind: 'transforming';
  readonly transformCount: number;
  readonly steps: readonly (TransformStepSnapshot | ActivityStepSnapshot)[];
}

export interface EnricherStepSnapshot extends SnapshotBase {
  readonly kind: 'enricher';
  readonly name: string;
  readonly detectedFileCount: number;
  readonly activities: readonly ActivityStepSnapshot[];
}

export interface ActivityStepSnapshot extends SnapshotBase {
  readonly kind: 'activity';
  readonly message: string;
}

export interface HeuristicStepSnapshot extends SnapshotBase {
  readonly kind: 'heuristic';
  readonly name: string;
}

export interface TransformStepSnapshot extends SnapshotBase {
  readonly kind: 'transform';
  readonly name: string;
  readonly transformedFileCount: number;
  readonly childTransforms: readonly TransformStepSnapshot[];
}
