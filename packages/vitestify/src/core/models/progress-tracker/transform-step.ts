import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface TransformStepSnapshot extends SnapshotBase {
  readonly kind: 'transform';
  readonly name: string;
  readonly transformedFileCount?: number;
  readonly childTransforms: readonly TransformStepSnapshot[];
  readonly stepNumber: number;
  readonly stepCount: number;
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
  private _transformedFileCount?: number;

  constructor(args: {
    name: string;
    stepNumber: number;
    stepCount: number;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createTransformStepSnapshot({
      name: args.name,
      stepNumber: args.stepNumber,
      stepCount: args.stepCount,
      childTransforms: [],
    });
  }

  get snapshot(): TransformStepSnapshot {
    return this._snapshot;
  }

  setTransformedFileCount(count: number): void {
    this._updateSnapshot({
      transformedFileCount: (this._transformedFileCount = count),
    });
  }

  createChildTransform(args: { name: string }): TransformStep {
    const child = new TransformStepNode({
      name: args.name,
      stepNumber: this._childTransforms.length + 1,
      stepCount: this._childTransforms.length + 1,
      onSnapshotChange: () => this._syncChildTransforms(),
    });
    this._childTransforms.push(child);
    this._syncChildStepIndices();
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

  _setStepIndex(stepNumber: number, stepCount: number): void {
    this._updateSnapshot({ stepNumber, stepCount });
  }

  private _syncChildStepIndices(): void {
    const stepCount = this._childTransforms.length;
    for (const [index, child] of this._childTransforms.entries()) {
      child._setStepIndex(index + 1, stepCount);
    }
  }

  private _syncChildTransforms(): void {
    const childTransforms = this._childTransforms.map((step) => step.snapshot);
    const rolledUpFileCount = _rolledUpTransformedFileCount(childTransforms);

    this._updateSnapshot({
      childTransforms,
      transformedFileCount: this._transformedFileCount ?? rolledUpFileCount,
    });
  }

  private _updateSnapshot(partial: Partial<TransformStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createTransformStepSnapshot(args: {
  name: string;
  stepNumber: number;
  stepCount: number;
  transformedFileCount?: number;
  childTransforms: readonly TransformStepSnapshot[];
  status?: ProgressStatus;
  statusMessage?: string;
}): TransformStepSnapshot {
  return {
    kind: 'transform',
    name: args.name,
    stepNumber: args.stepNumber,
    stepCount: args.stepCount,
    status: args.status ?? 'started',
    childTransforms: args.childTransforms,
    ...(args.transformedFileCount !== undefined
      ? { transformedFileCount: args.transformedFileCount }
      : {}),
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}

function _rolledUpTransformedFileCount(
  children: readonly TransformStepSnapshot[],
): number | undefined {
  let total = 0;
  let hasAny = false;

  for (const child of children) {
    if (child.transformedFileCount !== undefined) {
      total += child.transformedFileCount;
      hasAny = true;
    }
  }

  return hasAny ? total : undefined;
}
