export type ProgressStatus = 'started' | 'done' | 'failed';

export interface SnapshotBase {
  readonly status: ProgressStatus;
  readonly statusMessage?: string;
}
