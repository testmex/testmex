import { EnricherStepNode } from './enricher-step';
import type { EnricherStep, EnricherStepSnapshot } from './enricher-step';
import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface ScanningPhaseSnapshot extends SnapshotBase {
  readonly kind: 'scanning';
  readonly enricherCount: number;
  readonly steps: readonly EnricherStepSnapshot[];
}

export interface ScanningPhase {
  createEnricherStep(args: { name: string }): EnricherStep;
  done(message?: string): void;
}

export class ScanningPhaseNode implements ScanningPhase {
  private readonly _steps: EnricherStepNode[] = [];
  private _snapshot: ScanningPhaseSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    enricherCount: number;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createScanningPhaseSnapshot({
      enricherCount: args.enricherCount,
      steps: [],
    });
  }

  get snapshot(): ScanningPhaseSnapshot {
    return this._snapshot;
  }

  createEnricherStep(args: { name: string }): EnricherStep {
    const step = new EnricherStepNode({
      name: args.name,
      stepNumber: this._steps.length + 1,
      stepCount: this._snapshot.enricherCount,
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

  private _updateSnapshot(partial: Partial<ScanningPhaseSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createScanningPhaseSnapshot(args: {
  enricherCount: number;
  steps: readonly EnricherStepSnapshot[];
  status?: ProgressStatus;
  statusMessage?: string;
}): ScanningPhaseSnapshot {
  return {
    kind: 'scanning',
    enricherCount: args.enricherCount,
    status: args.status ?? 'started',
    steps: args.steps,
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
