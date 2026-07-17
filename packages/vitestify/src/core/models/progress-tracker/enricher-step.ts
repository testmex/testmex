import { ActivityStepNode } from './activity-step';
import type { ActivityStep, ActivityStepSnapshot } from './activity-step';
import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface EnricherStepSnapshot extends SnapshotBase {
  readonly kind: 'enricher';
  readonly name: string;
  readonly detectedFileCount: number;
  readonly activities: readonly ActivityStepSnapshot[];
}

export interface EnricherStep {
  setFilesDetected(count: number): void;
  createActivityStep(message: string): ActivityStep;
  done(message?: string): void;
  fail(message?: string): void;
}

export class EnricherStepNode implements EnricherStep {
  private readonly _activities: ActivityStepNode[] = [];
  private _snapshot: EnricherStepSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    name: string;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createEnricherStepSnapshot({ name: args.name });
  }

  get snapshot(): EnricherStepSnapshot {
    return this._snapshot;
  }

  setFilesDetected(count: number): void {
    this._updateSnapshot({ detectedFileCount: count });
  }

  createActivityStep(message: string): ActivityStep {
    const activity = new ActivityStepNode({
      message,
      onSnapshotChange: () => this._syncActivities(),
    });
    this._activities.push(activity);
    this._syncActivities();
    return activity;
  }

  done(message?: string): void {
    this._updateSnapshot({
      status: 'done',
      ...(message !== undefined ? { statusMessage: message } : {}),
    });
  }

  fail(message?: string): void {
    this._updateSnapshot({
      status: 'failed',
      ...(message !== undefined ? { statusMessage: message } : {}),
    });
  }

  private _syncActivities(): void {
    this._updateSnapshot({
      activities: this._activities.map((step) => step.snapshot),
    });
  }

  private _updateSnapshot(partial: Partial<EnricherStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createEnricherStepSnapshot(args: {
  name: string;
  detectedFileCount?: number;
  activities?: readonly ActivityStepSnapshot[];
  status?: ProgressStatus;
  statusMessage?: string;
}): EnricherStepSnapshot {
  return {
    kind: 'enricher',
    name: args.name,
    status: args.status ?? 'started',
    detectedFileCount: args.detectedFileCount ?? 0,
    activities: args.activities ?? [],
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
