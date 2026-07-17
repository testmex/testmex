import { describe, it } from 'vitest';
import { ThrottledProgressListener } from './throttled-progress-listener';

describe(ThrottledProgressListener, () => {
  it.todo('throttles file-count snapshot updates only', () => {
    // Attach throttled listener to a tracker; call `setFilesDetected` / `setTransformedFileCount` rapidly within the throttle window.
    // Assert inner listener receives fewer render calls than tracker emissions.
  });

  it.todo('passes through non-file-count updates immediately', () => {
    // Emit snapshot changes for activity `message`, `status` transition, or `done` / `fail`.
    // Assert inner listener is called on every emission without throttling.
  });

  it.todo('flushes latest file count on done', () => {
    // Rapid file-count updates then immediate `done` before interval elapses.
    // Assert inner listener renders final file count.
  });
});
