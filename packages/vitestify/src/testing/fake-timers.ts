import { onTestFinished, vi } from 'vitest';

export function useFakeTimers(): void {
  vi.useFakeTimers();
  onTestFinished(() => {
    vi.useRealTimers();
  });
}
