import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface HeuristicStepSnapshot extends SnapshotBase {
  readonly kind: 'heuristic';
  readonly name: string;
}

export interface HeuristicStep {
  done(message?: string): void;
  fail(message?: string): void;
}

export class HeuristicStepNode implements HeuristicStep {
  private _snapshot: HeuristicStepSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    name: string;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createHeuristicStepSnapshot({ name: args.name });
  }

  get snapshot(): HeuristicStepSnapshot {
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

  private _updateSnapshot(partial: Partial<HeuristicStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createHeuristicStepSnapshot(args: {
  name: string;
  status?: ProgressStatus;
  statusMessage?: string;
}): HeuristicStepSnapshot {
  return {
    kind: 'heuristic',
    name: args.name,
    status: args.status ?? 'started',
    ...(args.statusMessage !== undefined ? { statusMessage: args.statusMessage } : {}),
  };
}
