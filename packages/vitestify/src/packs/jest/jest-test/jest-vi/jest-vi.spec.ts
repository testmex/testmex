import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../../jest-symbol/jest-symbol.heuristic';
import { transformTestFile as runTransformTestFile } from '../../testing';
import { jestViTransform } from './jest-vi.transform';

describe(jestViTransform.name, () => {
  it('rewrites `jest.spyOn` to `vi.spyOn`', async () => {
    expect(
      await transformTestFile(
        `jest.spyOn(recipeService, 'cookRecipe').mockRejectedValueOnce(new Error('Oven unavailable'));`,
      ),
    ).toBe(
      `\
import { vi } from 'vitest';
vi.spyOn(recipeService, 'cookRecipe').mockRejectedValueOnce(new Error('Oven unavailable'));`,
    );
  });

  it('rewrites `jest.fn` to `vi.fn` in a call argument', async () => {
    expect(
      await transformTestFile(
        `await recipeService.saveRecipe(pastaRecipe, jest.fn());`,
      ),
    ).toContain(
      `\
await recipeService.saveRecipe(pastaRecipe, vi.fn());`,
    );
  });

  it('rewrites `jest.fn` to `vi.fn` in an object literal', async () => {
    expect(
      await transformTestFile(
        `const kitchen = { prepare: jest.fn(), serve: jest.fn().mockReturnThis() };`,
      ),
    ).toContain(
      `\
const kitchen = { prepare: vi.fn(), serve: vi.fn().mockReturnThis() };`,
    );
  });

  it('rewrites `jest.clearAllMocks` to `vi.clearAllMocks`', async () => {
    expect(await transformTestFile(`jest.clearAllMocks();`)).toContain(
      `\
vi.clearAllMocks();`,
    );
  });

  it('rewrites `jest.resetAllMocks` to `vi.resetAllMocks`', async () => {
    expect(
      await transformTestFile(`\
beforeEach(() => {
  jest.resetAllMocks();
});`),
    ).toContain(
      `\
beforeEach(() => {
  vi.resetAllMocks();
});`,
    );
  });

  it('rewrites `jest.restoreAllMocks` to `vi.restoreAllMocks`', async () => {
    expect(
      await transformTestFile(`\
afterEach(async () => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});`),
    ).toContain(
      `\
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});`,
    );
  });

  it('rewrites `jest.deepUnmock` to `vi.unmock`', async () => {
    expect(
      await transformTestFile(`jest.deepUnmock('./my-module');`),
    ).toContain(
      `\
vi.unmock('./my-module');`,
    );
  });

  it('rewrites `jest.unmock` to `vi.unmock`', async () => {
    expect(await transformTestFile(`jest.unmock('./my-module');`)).toContain(
      `\
vi.unmock('./my-module');`,
    );
  });

  it('rewrites `jest.resetModules` to `vi.resetModules`', async () => {
    expect(await transformTestFile(`jest.resetModules();`)).toContain(
      `\
vi.resetModules();`,
    );
  });

  it('rewrites `jest.isolateModules` to `vi.isolateModules`', async () => {
    expect(
      await transformTestFile(`jest.isolateModules(() => { /* … */ });`),
    ).toContain(
      `\
vi.isolateModules(() => { /* … */ });`,
    );
  });

  it('rewrites `jest.doMock` to `vi.doMock`', async () => {
    expect(
      await transformTestFile(
        `jest.doMock('./my-module', () => ({ canCook: () => true }));`,
      ),
    ).toContain(
      `\
vi.doMock('./my-module', () => ({ canCook: () => true }));`,
    );
  });

  it('rewrites `jest.mocked` to `vi.mocked`', async () => {
    expect(await transformTestFile(`jest.mocked(cookRecipe);`)).toContain(
      `\
vi.mocked(cookRecipe);`,
    );
  });

  it('rewrites `jest.hoisted` to `vi.hoisted`', async () => {
    expect(
      await transformTestFile(
        `const canCook = jest.hoisted(() => () => true);`,
      ),
    ).toContain(
      `\
const canCook = vi.hoisted(() => () => true);`,
    );
  });

  it('rewrites `jest.useFakeTimers` to `vi.useFakeTimers`', async () => {
    expect(
      await transformTestFile(`\
beforeEach(() => {
  jest.useFakeTimers();
});`),
    ).toContain(
      `\
beforeEach(() => {
  vi.useFakeTimers();
});`,
    );
  });

  it('rewrites `jest.useRealTimers` to `vi.useRealTimers`', async () => {
    expect(await transformTestFile(`jest.useRealTimers();`)).toContain(
      `vi.useRealTimers();`,
    );
  });

  it('rewrites `jest.advanceTimersByTimeAsync` to `vi.advanceTimersByTimeAsync`', async () => {
    expect(
      await transformTestFile(`await jest.advanceTimersByTimeAsync(0);`),
    ).toContain(
      `\
await vi.advanceTimersByTimeAsync(0);`,
    );
  });

  it('rewrites `jest.runOnlyPendingTimersAsync` to `vi.runOnlyPendingTimersAsync`', async () => {
    expect(
      await transformTestFile(`await jest.runOnlyPendingTimersAsync();`),
    ).toContain(
      `\
await vi.runOnlyPendingTimersAsync();`,
    );
  });

  it('rewrites `jest.runAllTimersAsync` to `vi.runAllTimersAsync`', async () => {
    expect(
      await transformTestFile(`await jest.runAllTimersAsync();`),
    ).toContain(
      `\
await vi.runAllTimersAsync();`,
    );
  });

  it('rewrites `jest.advanceTimersByTime` to `vi.advanceTimersByTime`', async () => {
    expect(
      await transformTestFile(`jest.advanceTimersByTime(1000);`),
    ).toContain(
      `\
vi.advanceTimersByTime(1000);`,
    );
  });

  it('rewrites `jest.runAllTimers` to `vi.runAllTimers`', async () => {
    expect(await transformTestFile(`jest.runAllTimers();`)).toContain(
      `vi.runAllTimers();`,
    );
  });

  it('rewrites `jest.runOnlyPendingTimers` to `vi.runOnlyPendingTimers`', async () => {
    expect(await transformTestFile(`jest.runOnlyPendingTimers();`)).toContain(
      `vi.runOnlyPendingTimers();`,
    );
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [jestViTransform],
  });
}
