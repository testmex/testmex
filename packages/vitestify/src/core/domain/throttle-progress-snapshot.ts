import {
  EMPTY,
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
  current: ProgressSnapshot,
): boolean {
  const prevPhase = previous.phases.at(-1);
  const currentPhase = current.phases.at(-1);

  if (!prevPhase || !currentPhase || currentPhase.kind !== prevPhase.kind) {
    return false;
  }
  const prevStep = prevPhase.steps.at(-1);
  const currentStep = currentPhase.steps.at(-1);
  if (!prevStep || !currentStep || currentStep.kind !== prevStep.kind) {
    return false;
  }

  if (prevStep.kind === 'enricher' && currentStep.kind === 'enricher') {
    const { detectedFileCount: previousCount, ...previousStepRest } = prevStep;
    const { detectedFileCount: currentCount, ...currentStepRest } = currentStep;
    return (
      previousCount !== currentCount &&
      JSON.stringify(previousStepRest) === JSON.stringify(currentStepRest)
    );
  }

  if (prevStep.kind === 'transform' && currentStep.kind === 'transform') {
    const {
      transformedFileCount: previousCount,
      childTransforms: prevChildTransforms,
      ...previousStepRest
    } = prevStep;
    const {
      transformedFileCount: currentCount,
      childTransforms: currentChildTransforms,
      ...currentStepRest
    } = currentStep;

    if (prevChildTransforms.length !== currentChildTransforms.length) {
      return false;
    }

    const { transformedFileCount: previousChildCount, ...previousChildRest } =
      prevChildTransforms.at(-1) ?? {};
    const { transformedFileCount: currentChildCount, ...currentChildRest } =
      currentChildTransforms.at(-1) ?? {};
    return (
      (previousCount !== currentCount &&
        JSON.stringify(previousStepRest) === JSON.stringify(currentStepRest)) ||
      (previousChildCount !== currentChildCount &&
        JSON.stringify(previousChildRest) === JSON.stringify(currentChildRest))
    );
  }

  return false;
}
