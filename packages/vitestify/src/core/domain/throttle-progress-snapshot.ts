import {
  concat,
  EMPTY,
  map,
  mergeMap,
  type MonoTypeOperatorFunction,
  type Observable,
  of,
  take,
  timer,
} from 'rxjs';
import type { ProgressSnapshot } from '../models/progress-tracker';

export function throttleProgressSnapshot(
  duration: number,
): MonoTypeOperatorFunction<ProgressSnapshot> {
  return (source$) => {
    let previous: ProgressSnapshot | null = null;
    let pending: ProgressSnapshot | null = null;

    return source$.pipe(
      mergeMap((snapshot): Observable<ProgressSnapshot> => {
        /* Initial emission. */
        if (previous === null) {
          return _emitSnapshot(snapshot);
        }

        /* Throttle file count updates. */
        if (_isFileCountOnlyChange(previous, snapshot)) {
          const isAlreadyScheduled = pending !== null;
          pending = snapshot;

          /* Only schedule a flush if not already scheduled.
           * We updated the `pending` snapshot anyway and that's
           * what the previously scheduled flush will emit. */
          return isAlreadyScheduled
            ? EMPTY
            : timer(duration).pipe(
                take(1),
                mergeMap(() => {
                  if (pending === null) {
                    return EMPTY;
                  }
                  const result = pending;
                  pending = null;
                  return _emitSnapshot(result);
                }),
              );
        }

        return _emitSnapshot(snapshot);
      }),
    );

    function _emitSnapshot(
      snapshot: ProgressSnapshot,
    ): Observable<ProgressSnapshot> {
      pending = null;
      previous = snapshot;
      return of(snapshot);
    }
  };
}

function _isFileCountOnlyChange(
  previous: ProgressSnapshot,
  next: ProgressSnapshot,
): boolean {
  const previousCount = _activeFileCount(previous);
  const nextCount = _activeFileCount(next);

  if (previousCount === nextCount) {
    return false;
  }

  return (
    JSON.stringify(_stripActiveFileCount(previous)) ===
    JSON.stringify(_stripActiveFileCount(next))
  );
}

function _activeFileCount(snapshot: ProgressSnapshot): number | undefined {
  const phase = snapshot.phases.at(-1);
  if (!phase) {
    return undefined;
  }

  const step = phase.steps.at(-1);
  if (!step) {
    return undefined;
  }

  if (phase.kind === 'scanning' && step.kind === 'enricher') {
    return step.detectedFileCount;
  }

  if (phase.kind === 'transforming' && step.kind === 'transform') {
    return (
      step.childTransforms.at(-1)?.transformedFileCount ??
      step.transformedFileCount
    );
  }

  return undefined;
}

function _stripActiveFileCount(snapshot: ProgressSnapshot): ProgressSnapshot {
  const phaseIndex = snapshot.phases.length - 1;
  if (phaseIndex < 0) {
    return snapshot;
  }

  return {
    phases: snapshot.phases.map((phase, index) => {
      if (index !== phaseIndex) {
        return phase;
      }

      const stepIndex = phase.steps.length - 1;
      if (stepIndex < 0) {
        return phase;
      }

      switch (phase.kind) {
        case 'scanning':
          return {
            ...phase,
            steps: phase.steps.map((step, stepIdx) =>
              stepIdx === stepIndex ? { ...step, detectedFileCount: 0 } : step,
            ),
          };
        case 'transforming':
          return {
            ...phase,
            steps: phase.steps.map((step, stepIdx) => {
              if (stepIdx !== stepIndex || step.kind !== 'transform') {
                return step;
              }

              const childIndex = step.childTransforms.length - 1;
              if (childIndex < 0) {
                return { ...step, transformedFileCount: 0 };
              }

              return {
                ...step,
                transformedFileCount: 0,
                childTransforms: step.childTransforms.map((child, childIdx) =>
                  childIdx === childIndex
                    ? { ...child, transformedFileCount: 0 }
                    : child,
                ),
              };
            }),
          };
        case 'analysis':
          return phase;
      }
    }),
  };
}
