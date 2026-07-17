import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface ActivityStepSnapshot extends SnapshotBase {
  readonly kind: 'activity';
  readonly message: string;
}

export interface ActivityStep {
  done(message?: string): void;
  fail(message?: string): void;
}

export class ActivityStepNode implements ActivityStep {
  private _snapshot: ActivityStepSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    message: string;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createActivityStepSnapshot({ message: args.message });
  }

  get snapshot(): ActivityStepSnapshot {
    return this._snapshot;
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

  private _updateSnapshot(partial: Partial<ActivityStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createActivityStepSnapshot(args: {
  message: string;
  status?: ProgressStatus;
  statusMessage?: string;
}): ActivityStepSnapshot {
  return {
    kind: 'activity',
    message: args.message,
    status: args.status ?? 'started',
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
