import { ChildStepNode } from './child-step';
import type { ChildStep, ChildStepSnapshot } from './child-step';
import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface ActivityStepSnapshot extends SnapshotBase {
  readonly kind: 'activity';
  readonly message: string;
  readonly childSteps: readonly ChildStepSnapshot[];
}

export interface ActivityStep {
  createChildStep(message: string): ChildStep;
  done(message?: string): void;
  fail(message?: string): void;
}

export class ActivityStepNode implements ActivityStep {
  private readonly _childSteps: ChildStepNode[] = [];
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

  createChildStep(message: string): ChildStep {
    const childStep = new ChildStepNode({
      message,
      onSnapshotChange: () => this._syncChildSteps(),
    });
    this._childSteps.push(childStep);
    this._syncChildSteps();
    return childStep;
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

  private _syncChildSteps(): void {
    this._updateSnapshot({
      childSteps: this._childSteps.map((step) => step.snapshot),
    });
  }

  private _updateSnapshot(partial: Partial<ActivityStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createActivityStepSnapshot(args: {
  message: string;
  childSteps?: readonly ChildStepSnapshot[];
  status?: ProgressStatus;
  statusMessage?: string;
}): ActivityStepSnapshot {
  return {
    kind: 'activity',
    message: args.message,
    status: args.status ?? 'started',
    childSteps: args.childSteps ?? [],
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
