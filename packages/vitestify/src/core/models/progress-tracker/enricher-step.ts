import { ChildStepNode } from './child-step';
import type { ChildStep, ChildStepSnapshot } from './child-step';
import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface EnricherStepSnapshot extends SnapshotBase {
  readonly kind: 'enricher';
  readonly name: string;
  readonly detectedFileCount?: number;
  readonly childSteps: readonly ChildStepSnapshot[];
  readonly stepNumber: number;
  readonly stepCount: number;
}

export interface EnricherStep {
  setDetectedFileCount(count: number): void;
  createChildStep(message: string): ChildStep;
  done(message?: string): void;
  fail(message?: string): void;
}

export class EnricherStepNode implements EnricherStep {
  private readonly _childSteps: ChildStepNode[] = [];
  private _snapshot: EnricherStepSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    name: string;
    stepNumber: number;
    stepCount: number;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createEnricherStepSnapshot({
      name: args.name,
      stepNumber: args.stepNumber,
      stepCount: args.stepCount,
    });
  }

  get snapshot(): EnricherStepSnapshot {
    return this._snapshot;
  }

  setDetectedFileCount(count: number): void {
    this._updateSnapshot({ detectedFileCount: count });
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

  private _updateSnapshot(partial: Partial<EnricherStepSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createEnricherStepSnapshot(args: {
  name: string;
  stepNumber: number;
  stepCount: number;
  detectedFileCount?: number;
  childSteps?: readonly ChildStepSnapshot[];
  status?: ProgressStatus;
  statusMessage?: string;
}): EnricherStepSnapshot {
  return {
    kind: 'enricher',
    name: args.name,
    stepNumber: args.stepNumber,
    stepCount: args.stepCount,
    status: args.status ?? 'started',
    childSteps: args.childSteps ?? [],
    ...(args.detectedFileCount !== undefined
      ? { detectedFileCount: args.detectedFileCount }
      : {}),
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
