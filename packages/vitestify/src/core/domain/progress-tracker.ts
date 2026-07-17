import type {
  ActivityStepSnapshot,
  EnricherStepSnapshot,
  HeuristicStepSnapshot,
  PhaseSnapshot,
  ProgressSnapshot,
  ProgressStatus,
  TransformStepSnapshot,
} from '../models/progress-snapshot';

export type Unsubscribe = () => void;

export class ProgressTracker {
  private readonly _phases: MutablePhaseState[] = [];
  private readonly _listeners = new Set<(snapshot: ProgressSnapshot) => void>();

  beginScanning(args: { enricherCount: number }): ScanningPhase {
    const phase = this._createPhase('scanning', args.enricherCount);
    return this._createScanningPhase(phase);
  }

  beginAnalysis(args: { heuristicsCount: number }): AnalysisPhase {
    const phase = this._createPhase('analysis', args.heuristicsCount);
    return this._createAnalysisPhase(phase);
  }

  beginTransforming(args: { transformCount: number }): TransformingPhase {
    const phase = this._createPhase('transforming', args.transformCount);
    return this._createTransformingPhase(phase);
  }

  snapshot(): ProgressSnapshot {
    return { phases: this._phases.map((phase) => this._toPhaseSnapshot(phase)) };
  }

  subscribe(listener: (snapshot: ProgressSnapshot) => void): Unsubscribe {
    this._listeners.add(listener);
    listener(this.snapshot());
    return () => this._listeners.delete(listener);
  }

  private _emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this._listeners) {
      listener(snapshot);
    }
  }

  private _createPhase(
    kind: PhaseKind,
    stepCount: number,
  ): MutablePhaseState {
    const phase: MutablePhaseState = {
      kind,
      stepCount,
      status: 'started',
      steps: [],
    };
    this._phases.push(phase);
    this._emit();
    return phase;
  }

  private _createScanningPhase(phase: MutablePhaseState): ScanningPhase {
    return {
      createEnricherStep: (args) =>
        this._createEnricherStepHandle(this._createEnricherStep(phase, args.name)),
      done: (message) => this._completePhase(phase, message),
    };
  }

  private _createAnalysisPhase(phase: MutablePhaseState): AnalysisPhase {
    return {
      createHeuristicStep: (args) =>
        this._createHeuristicStepHandle(
          this._createHeuristicStep(phase, args.name),
        ),
      done: (message) => this._completePhase(phase, message),
    };
  }

  private _createTransformingPhase(phase: MutablePhaseState): TransformingPhase {
    return {
      createTransformStep: (args) =>
        this._createTransformStepHandle(
          this._createTransformStep(phase, args.name),
        ),
      createActivityStep: () =>
        this._createActivityStepHandle(this._createActivityStep(phase, '')),
      done: (message) => this._completePhase(phase, message),
    };
  }

  private _createEnricherStep(
    phase: MutablePhaseState,
    name: string,
  ): MutableEnricherStepState {
    const step: MutableEnricherStepState = {
      kind: 'enricher',
      name,
      status: 'started',
      detectedFileCount: 0,
      activities: [],
    };
    phase.steps.push(step);
    this._emit();
    return step;
  }

  private _createHeuristicStep(
    phase: MutablePhaseState,
    name: string,
  ): MutableHeuristicStepState {
    const step: MutableHeuristicStepState = {
      kind: 'heuristic',
      name,
      status: 'started',
    };
    phase.steps.push(step);
    this._emit();
    return step;
  }

  private _createTransformStep(
    phase: MutablePhaseState,
    name: string,
    parent?: MutableTransformStepState,
  ): MutableTransformStepState {
    const step: MutableTransformStepState = {
      kind: 'transform',
      name,
      status: 'started',
      transformedFileCount: 0,
      childTransforms: [],
    };

    if (parent) {
      parent.childTransforms.push(step);
    } else {
      phase.steps.push(step);
    }

    this._emit();
    return step;
  }

  private _createActivityStep(
    parent: MutablePhaseState | MutableEnricherStepState,
    message: string,
  ): MutableActivityStepState {
    const step: MutableActivityStepState = {
      kind: 'activity',
      status: 'started',
      message,
    };

    if (parent.kind === 'enricher') {
      parent.activities.push(step);
    } else {
      parent.steps.push(step);
    }

    this._emit();
    return step;
  }

  private _createEnricherStepHandle(step: MutableEnricherStepState): EnricherStep {
    return {
      setFilesDetected: (count) => {
        step.detectedFileCount = count;
        this._emit();
      },
      createActivityStep: (message) =>
        this._createActivityStepHandle(this._createActivityStep(step, message)),
      done: (message) => this._completeStep(step, message),
      fail: (message) => this._failStep(step, message),
    };
  }

  private _createHeuristicStepHandle(
    step: MutableHeuristicStepState,
  ): HeuristicStep {
    return {
      updateMessage: (message) => {
        step.statusMessage = message;
        this._emit();
      },
      done: (message) => this._completeStep(step, message),
      fail: (message) => this._failStep(step, message),
    };
  }

  private _createTransformStepHandle(
    step: MutableTransformStepState,
  ): TransformStep {
    return {
      updateMessage: (message) => {
        step.statusMessage = message;
        this._emit();
      },
      setTransformedFileCount: (count) => {
        step.transformedFileCount = count;
        this._emit();
      },
      createChildTransform: (args) => {
        const phase = this._findPhaseForTransformStep(step);
        return this._createTransformStepHandle(
          this._createTransformStep(phase, args.name, step),
        );
      },
      done: (message) => this._completeStep(step, message),
      fail: (message) => this._failStep(step, message),
    };
  }

  private _createActivityStepHandle(
    step: MutableActivityStepState,
  ): ActivityStep {
    return {
      updateMessage: (message) => {
        step.message = message;
        this._emit();
      },
      done: (message) => this._completeStep(step, message),
      fail: (message) => this._failStep(step, message),
    };
  }

  private _completePhase(phase: MutablePhaseState, message?: string): void {
    phase.status = 'done';
    if (message !== undefined) {
      phase.statusMessage = message;
    }
    this._emit();
  }

  private _completeStep(step: MutableStepState, message?: string): void {
    step.status = 'done';
    if (message !== undefined) {
      step.statusMessage = message;
    }
    this._emit();
  }

  private _failStep(step: MutableStepState, message?: string): void {
    step.status = 'failed';
    if (message !== undefined) {
      step.statusMessage = message;
    }
    this._emit();
  }

  private _findPhaseForTransformStep(
    target: MutableTransformStepState,
  ): MutablePhaseState {
    for (const phase of this._phases) {
      if (phase.kind !== 'transforming') {
        continue;
      }

      if (this._containsTransformStep(phase.steps, target)) {
        return phase;
      }
    }

    throw new Error('transform step not found');
  }

  private _containsTransformStep(
    steps: MutableStepState[],
    target: MutableTransformStepState,
  ): boolean {
    for (const step of steps) {
      if (step === target) {
        return true;
      }

      if (
        step.kind === 'transform' &&
        this._containsTransformStep(step.childTransforms, target)
      ) {
        return true;
      }
    }

    return false;
  }

  private _toPhaseSnapshot(phase: MutablePhaseState): PhaseSnapshot {
    const base = {
      status: phase.status,
      ...(phase.statusMessage !== undefined
        ? { statusMessage: phase.statusMessage }
        : {}),
    };

    switch (phase.kind) {
      case 'scanning':
        return {
          kind: 'scanning',
          enricherCount: phase.stepCount,
          ...base,
          steps: phase.steps.map((step) =>
            this._toEnricherStepSnapshot(step as MutableEnricherStepState),
          ),
        };
      case 'analysis':
        return {
          kind: 'analysis',
          heuristicsCount: phase.stepCount,
          ...base,
          steps: phase.steps.map((step) =>
            this._toHeuristicStepSnapshot(step as MutableHeuristicStepState),
          ),
        };
      case 'transforming':
        return {
          kind: 'transforming',
          transformCount: phase.stepCount,
          ...base,
          steps: phase.steps.map((step) => this._toTransformingStepSnapshot(step)),
        };
    }
  }

  private _toEnricherStepSnapshot(
    step: MutableEnricherStepState,
  ): EnricherStepSnapshot {
    return {
      kind: 'enricher',
      name: step.name,
      status: step.status,
      detectedFileCount: step.detectedFileCount,
      activities: step.activities.map((activity) =>
        this._toActivityStepSnapshot(activity),
      ),
      ...(step.statusMessage !== undefined
        ? { statusMessage: step.statusMessage }
        : {}),
    };
  }

  private _toHeuristicStepSnapshot(
    step: MutableHeuristicStepState,
  ): HeuristicStepSnapshot {
    return {
      kind: 'heuristic',
      name: step.name,
      status: step.status,
      ...(step.statusMessage !== undefined
        ? { statusMessage: step.statusMessage }
        : {}),
    };
  }

  private _toTransformingStepSnapshot(
    step: MutableStepState,
  ): TransformStepSnapshot | ActivityStepSnapshot {
    if (step.kind === 'activity') {
      return this._toActivityStepSnapshot(step);
    }

    if (step.kind !== 'transform') {
      throw new Error('expected transform step');
    }

    return this._toTransformStepSnapshot(step);
  }

  private _toTransformStepSnapshot(
    step: MutableTransformStepState,
  ): TransformStepSnapshot {
    return {
      kind: 'transform',
      name: step.name,
      status: step.status,
      transformedFileCount: step.transformedFileCount,
      childTransforms: step.childTransforms.map((child) =>
        this._toTransformStepSnapshot(child),
      ),
      ...(step.statusMessage !== undefined
        ? { statusMessage: step.statusMessage }
        : {}),
    };
  }

  private _toActivityStepSnapshot(
    step: MutableActivityStepState,
  ): ActivityStepSnapshot {
    return {
      kind: 'activity',
      status: step.status,
      message: step.message,
      ...(step.statusMessage !== undefined
        ? { statusMessage: step.statusMessage }
        : {}),
    };
  }
}

export interface ScanningPhase {
  createEnricherStep(args: { name: string }): EnricherStep;
  done(message?: string): void;
}

export interface AnalysisPhase {
  createHeuristicStep(args: { name: string }): HeuristicStep;
  done(message?: string): void;
}

export interface TransformingPhase {
  createTransformStep(args: { name: string }): TransformStep;
  createActivityStep(): ActivityStep;
  done(message?: string): void;
}

export interface EnricherStep {
  setFilesDetected(count: number): void;
  createActivityStep(message: string): ActivityStep;
  done(message?: string): void;
  fail(message?: string): void;
}

export interface ActivityStep {
  updateMessage(message: string): void;
  done(message?: string): void;
  fail(message?: string): void;
}

export interface HeuristicStep {
  updateMessage(message: string): void;
  done(message?: string): void;
  fail(message?: string): void;
}

export interface TransformStep {
  updateMessage(message: string): void;
  setTransformedFileCount(count: number): void;
  createChildTransform(args: { name: string }): TransformStep;
  done(message?: string): void;
  fail(message?: string): void;
}

type PhaseKind = 'scanning' | 'analysis' | 'transforming';

interface MutablePhaseState {
  kind: PhaseKind;
  stepCount: number;
  status: ProgressStatus;
  statusMessage?: string;
  steps: MutableStepState[];
}

interface MutableStepStateBase {
  status: ProgressStatus;
  statusMessage?: string;
}

interface MutableEnricherStepState extends MutableStepStateBase {
  kind: 'enricher';
  name: string;
  detectedFileCount: number;
  activities: MutableActivityStepState[];
}

interface MutableHeuristicStepState extends MutableStepStateBase {
  kind: 'heuristic';
  name: string;
}

interface MutableTransformStepState extends MutableStepStateBase {
  kind: 'transform';
  name: string;
  transformedFileCount: number;
  childTransforms: MutableTransformStepState[];
}

interface MutableActivityStepState extends MutableStepStateBase {
  kind: 'activity';
  message: string;
}

type MutableStepState =
  | MutableEnricherStepState
  | MutableHeuristicStepState
  | MutableTransformStepState
  | MutableActivityStepState;
