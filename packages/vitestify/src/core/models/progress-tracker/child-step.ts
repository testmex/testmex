import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface ChildStepSnapshot extends SnapshotBase {
  readonly kind: 'child';
  readonly message: string;
}

export interface ChildStep {
  done(message?: string): void;
  fail(message?: string): void;
}

export class ChildStepNode implements ChildStep {
  private _snapshot: ChildStepSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    message: string;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createChildStepSnapshot({ message: args.message });
  }

  get snapshot(): ChildStepSnapshot {
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

  private _updateSnapshot(partial: Partial<ChildStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createChildStepSnapshot(args: {
  message: string;
  status?: ProgressStatus;
  statusMessage?: string;
}): ChildStepSnapshot {
  return {
    kind: 'child',
    message: args.message,
    status: args.status ?? 'started',
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
