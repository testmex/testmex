import { AnalysisPhaseNode } from './analysis-phase';
import type { AnalysisPhase, AnalysisPhaseSnapshot } from './analysis-phase';
import { ScanningPhaseNode } from './scanning-phase';
import type { ScanningPhase, ScanningPhaseSnapshot } from './scanning-phase';
import { TransformingPhaseNode } from './transforming-phase';
import type {
  TransformingPhase,
  TransformingPhaseSnapshot,
} from './transforming-phase';

export type Unsubscribe = () => void;

export type PhaseSnapshot =
  | ScanningPhaseSnapshot
  | AnalysisPhaseSnapshot
  | TransformingPhaseSnapshot;

export interface ProgressSnapshot {
  readonly phases: readonly PhaseSnapshot[];
}

interface PhaseNode {
  get snapshot(): PhaseSnapshot;
}

export class ProgressTracker {
  private readonly _phases: PhaseNode[] = [];
  private readonly _listeners = new Set<(snapshot: ProgressSnapshot) => void>();
  private _snapshot = _createProgressSnapshot();

  beginScanning(args: { enricherCount: number }): ScanningPhase {
    return this._addPhase(
      new ScanningPhaseNode({
        enricherCount: args.enricherCount,
        onSnapshotChange: () => this._emit(),
      }),
    );
  }

  beginAnalysis(args: { heuristicsCount: number }): AnalysisPhase {
    return this._addPhase(
      new AnalysisPhaseNode({
        heuristicsCount: args.heuristicsCount,
        onSnapshotChange: () => this._emit(),
      }),
    );
  }

  beginTransforming(args: { transformCount: number }): TransformingPhase {
    return this._addPhase(
      new TransformingPhaseNode({
        transformCount: args.transformCount,
        onSnapshotChange: () => this._emit(),
      }),
    );
  }

  snapshot(): ProgressSnapshot {
    return this._snapshot;
  }

  subscribe(listener: (snapshot: ProgressSnapshot) => void): Unsubscribe {
    this._listeners.add(listener);
    listener(this._snapshot);
    return () => this._listeners.delete(listener);
  }

  private _addPhase<T extends PhaseNode>(phase: T): T {
    this._phases.push(phase);
    this._emit();
    return phase;
  }

  private _emit(): void {
    this._updateSnapshot({
      phases: this._phases.map((phase) => phase.snapshot),
    });
    for (const listener of this._listeners) {
      listener(this._snapshot);
    }
  }

  private _updateSnapshot(partial: Partial<ProgressSnapshot>): void {
    this._snapshot = { ...this._snapshot, ...partial };
  }
}

function _createProgressSnapshot(): ProgressSnapshot {
  return { phases: [] };
}
