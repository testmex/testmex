import { HeuristicStepNode } from './heuristic-step';
import type { HeuristicStep, HeuristicStepSnapshot } from './heuristic-step';
import type { ProgressStatus, SnapshotBase } from './snapshot-base';
import type { SnapshotChangeListener } from './snapshot-change-listener';

export interface AnalysisPhaseSnapshot extends SnapshotBase {
  readonly kind: 'analysis';
  readonly heuristicsCount: number;
  readonly steps: readonly HeuristicStepSnapshot[];
}

export interface AnalysisPhase {
  createHeuristicStep(args: { name: string }): HeuristicStep;
  done(message?: string): void;
}

export class AnalysisPhaseNode implements AnalysisPhase {
  private readonly _steps: HeuristicStepNode[] = [];
  private _snapshot: AnalysisPhaseSnapshot;
  private readonly _onSnapshotChange: SnapshotChangeListener;

  constructor(args: {
    heuristicsCount: number;
    onSnapshotChange: SnapshotChangeListener;
  }) {
    this._onSnapshotChange = args.onSnapshotChange;
    this._snapshot = _createAnalysisPhaseSnapshot({
      heuristicsCount: args.heuristicsCount,
    });
  }

  get snapshot(): AnalysisPhaseSnapshot {
    return this._snapshot;
  }

  createHeuristicStep(args: { name: string }): HeuristicStep {
    const step = new HeuristicStepNode({
      name: args.name,
      onSnapshotChange: () => {
        this._updateSnapshot({
          steps: this._steps.map((child) => child.snapshot),
        });
      },
    });
    this._steps.push(step);
    this._updateSnapshot({
      steps: this._steps.map((child) => child.snapshot),
    });
    return step;
  }

  done(message?: string): void {
    this._updateSnapshot({
      status: 'done',
      ...(message !== undefined ? { statusMessage: message } : {}),
    });
  }

  private _updateSnapshot(partial: Partial<AnalysisPhaseSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
    this._onSnapshotChange();
  }
}

function _createAnalysisPhaseSnapshot(args: {
  heuristicsCount: number;
  steps?: readonly HeuristicStepSnapshot[];
  status?: ProgressStatus;
  statusMessage?: string;
}): AnalysisPhaseSnapshot {
  return {
    kind: 'analysis',
    heuristicsCount: args.heuristicsCount,
    status: args.status ?? 'started',
    steps: args.steps ?? [],
    ...(args.statusMessage !== undefined
      ? { statusMessage: args.statusMessage }
      : {}),
  };
}
