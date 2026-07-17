import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface TransformStepSnapshot extends SnapshotBase {
  readonly kind: 'transform';
  readonly name: string;
  readonly transformedFileCount: number;
  readonly childTransforms: readonly TransformStepSnapshot[];
}

export interface TransformStep {
  setTransformedFileCount(count: number): void;
  createChildTransform(args: { name: string }): TransformStep;
  done(message?: string): void;
  fail(message?: string): void;
}

export class TransformStepNode implements TransformStep {
  private readonly _childTransforms: TransformStepNode[] = [];
  private _snapshot: TransformStepSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    name: string;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createTransformStepSnapshot({
      name: args.name,
      childTransforms: [],
    });
  }

  get snapshot(): TransformStepSnapshot {
    return this._snapshot;
  }

  setTransformedFileCount(count: number): void {
    this._updateSnapshot({ transformedFileCount: count });
  }

  createChildTransform(args: { name: string }): TransformStep {
    const child = new TransformStepNode({
      name: args.name,
      onSnapshotChange: () => this._syncChildTransforms(),
    });
    this._childTransforms.push(child);
    this._syncChildTransforms();
    return child;
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

  private _syncChildTransforms(): void {
    this._updateSnapshot({
      childTransforms: this._childTransforms.map((step) => step.snapshot),
    });
  }

  private _updateSnapshot(partial: Partial<TransformStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createTransformStepSnapshot(args: {
  name: string;
  transformedFileCount?: number;
  childTransforms: readonly TransformStepSnapshot[];
  status?: ProgressStatus;
  statusMessage?: string;
}): TransformStepSnapshot {
  return {
    kind: 'transform',
    name: args.name,
    status: args.status ?? 'started',
    transformedFileCount: args.transformedFileCount ?? 0,
    childTransforms: args.childTransforms,
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
