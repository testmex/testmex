import { ActivityStepNode } from './activity-step';
import type { ActivityStep, ActivityStepSnapshot } from './activity-step';
import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';
import { TransformStepNode } from './transform-step';
import type { TransformStep, TransformStepSnapshot } from './transform-step';

export interface TransformingPhaseSnapshot extends SnapshotBase {
  readonly kind: 'transforming';
  readonly transformCount: number;
  readonly steps: readonly (TransformStepSnapshot | ActivityStepSnapshot)[];
}

export interface TransformingPhase {
  createTransformStep(args: { name: string }): TransformStep;
  createActivityStep(message: string): ActivityStep;
  done(message?: string): void;
}

type TransformingStepNode = TransformStepNode | ActivityStepNode;

export class TransformingPhaseNode implements TransformingPhase {
  private readonly _steps: TransformingStepNode[] = [];
  private _snapshot: TransformingPhaseSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    transformCount: number;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createTransformingPhaseSnapshot({
      transformCount: args.transformCount,
      steps: [],
    });
  }

  get snapshot(): TransformingPhaseSnapshot {
    return this._snapshot;
  }

  createTransformStep(args: { name: string }): TransformStep {
    const step = new TransformStepNode({
      name: args.name,
      stepNumber: this._steps.length + 1,
      stepCount: this._snapshot.transformCount,
      onSnapshotChange: () => this._syncSteps(),
    });
    this._steps.push(step);
    this._syncSteps();
    return step;
  }

  createActivityStep(message: string): ActivityStep {
    const step = new ActivityStepNode({
      message,
      onSnapshotChange: () => this._syncSteps(),
    });
    this._steps.push(step);
    this._syncSteps();
    return step;
  }

  done(message?: string): void {
    this._updateSnapshot({
      status: 'done',
      ...(message !== undefined ? { statusMessage: message } : {}),
    });
  }

  private _syncSteps(): void {
    this._updateSnapshot({
      steps: this._steps.map((child) => child.snapshot),
    });
  }

  private _updateSnapshot(partial: Partial<TransformingPhaseSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createTransformingPhaseSnapshot(args: {
  transformCount: number;
  steps: readonly (TransformStepSnapshot | ActivityStepSnapshot)[];
  status?: ProgressStatus;
  statusMessage?: string;
}): TransformingPhaseSnapshot {
  return {
    kind: 'transforming',
    transformCount: args.transformCount,
    status: args.status ?? 'started',
    steps: args.steps,
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
