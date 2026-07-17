import { describe, it } from 'vitest';
import { InMemoryProgressTracker } from './progress-tracker';

describe(InMemoryProgressTracker, () => {
  it.todo('emits immutable snapshots on mutation', () => {
    // Create a ProgressTracker.
    // Call beginScanning({ estimatedTotalSteps: 2 }), create one enricher step, setFilesDetected(5).
    // Capture snapshots from subscribe.
    // Assert the first and last snapshot are different object references.
    // Assert prior snapshot still shows detectedFileCount: 0 (unchanged).
  });

  it.todo('records typed phase and step snapshots', () => {
    // Begin scanning, analysis, and transforming phases in sequence.
    // Assert snapshot().phases has kinds scanning, analysis, transforming in order.
    // Assert each phase has estimatedTotalSteps and a typed steps array.
  });

  it.todo('nested child transforms and activities', () => {
    // Begin transforming; create a jest-test transform step.
    // Create two createChildTransform children; set transformedFileCount on each.
    // Create an enricher step with a nested createActivityStep; update its message.
    // Assert child transforms appear under childTransforms and activities under activities.
  });
});
