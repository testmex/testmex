import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { jestViTransform } from './jest-vi-transform';

describe('jestVi', () => {
  it('rewrites `jest.spyOn` to `vi.spyOn`', async () => {
    expect(
      await transformTestFile(
        `jest.spyOn(syncService, 'syncAgency').mockRejectedValueOnce(new Error('Database connection failed'));`,
      ),
    ).toBe(
      `\
import { vi } from 'vitest';
vi.spyOn(syncService, 'syncAgency').mockRejectedValueOnce(new Error('Database connection failed'));`,
    );
  });

  it('rewrites `jest.fn` to `vi.fn`', async () => {
    expect(
      await transformTestFile(
        `await service.uploadFile(imageFile, { sizeLimit: FILE_SIZE_LIMIT_45_MO }, jest.fn());`,
      ),
    ).toBe(
      `\
import { vi } from 'vitest';
await service.uploadFile(imageFile, { sizeLimit: FILE_SIZE_LIMIT_45_MO }, vi.fn());`,
    );

    expect(
      await transformTestFile(
        `const reply = { send: jest.fn(), status: jest.fn().mockReturnThis() };`,
      ),
    ).toBe(
      `\
import { vi } from 'vitest';
const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() };`,
    );
  });

  it('rewrites `jest.clearAllMocks` to `vi.clearAllMocks`', async () => {
    expect(await transformTestFile(`jest.clearAllMocks();`)).toBe(
      `\
import { vi } from 'vitest';
vi.clearAllMocks();`,
    );
  });

  it('rewrites `jest.resetAllMocks` to `vi.resetAllMocks`', async () => {
    expect(
      await transformTestFile(`\
beforeEach(() => {
  jest.resetAllMocks();
});`),
    ).toBe(
      `\
import { vi } from 'vitest';
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
    ).toBe(
      `\
import { vi } from 'vitest';
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});`,
    );
  });

  it(
    'rewrites `jest.requireActual` to `await vi.importActual` and marks enclosing function `async`',
    async () => {
      expect(
        await transformTestFile(`\
jest.mock('@mynotary/crossplatform/orpi-directories/core', () => ({
  ...jest.requireActual('@mynotary/crossplatform/orpi-directories/core'),
  canSyncAgency: jest.fn().mockReturnValue(true),
  canSyncAgencyCode: jest.fn().mockReturnValue(true)
}));`),
      ).toBe(
        `\
import { vi } from 'vitest';
vi.mock('@mynotary/crossplatform/orpi-directories/core', async () => ({
  ...(await vi.importActual('@mynotary/crossplatform/orpi-directories/core')),
  canSyncAgency: vi.fn().mockReturnValue(true),
  canSyncAgencyCode: vi.fn().mockReturnValue(true)
}));`,
      );
    },
  );

  it(
    'rewrites `jest.requireMock` to `await vi.importMock` and marks enclosing function `async`',
    async () => {
      expect(
        await transformTestFile(
          `const { canSyncAgency } = jest.requireMock('@mynotary/crossplatform/orpi-directories/core');`,
        ),
      ).toBe(
        `\
import { vi } from 'vitest';
const { canSyncAgency } = await vi.importMock('@mynotary/crossplatform/orpi-directories/core');`,
      );
    },
  );

  it(
    'rewrites `jest.genMockFromModule` / `jest.createMockFromModule` to `await vi.importMock`',
    async () => {
      expect(
        await transformTestFile(
          `const mocked = jest.createMockFromModule<typeof import('./module')>('./module');`,
        ),
      ).toBe(
        `\
import { vi } from 'vitest';
const mocked = await vi.importMock<typeof import('./module')>('./module');`,
      );
    },
  );

  it(
    'rewrites `jest.setMock` to `vi.mock` with factory function wrapper',
    async () => {
      expect(
        await transformTestFile(
          `jest.setMock('./module', () => ({ foo: 'bar' }));`,
        ),
      ).toBe(
        `\
import { vi } from 'vitest';
vi.mock('./module', () => ({ foo: 'bar' }));`,
      );
    },
  );

  it('rewrites `jest.deepUnmock` to `vi.unmock`', async () => {
    expect(await transformTestFile(`jest.deepUnmock('./heavy-module');`)).toBe(
      `\
import { vi } from 'vitest';
vi.unmock('./heavy-module');`,
    );
  });

  it('rewrites `jest.unmock` to `vi.unmock`', async () => {
    expect(await transformTestFile(`jest.unmock('./heavy-module');`)).toBe(
      `\
import { vi } from 'vitest';
vi.unmock('./heavy-module');`,
    );
  });

  it(
    'rewrites other `jest.*` APIs to `vi.*` (generic passthrough)',
    async () => {
      expect(await transformTestFile(`jest.resetModules();`)).toBe(
        `\
import { vi } from 'vitest';
vi.resetModules();`,
      );

      expect(
        await transformTestFile(`jest.isolateModules(() => { /* … */ });`),
      ).toBe(
        `\
import { vi } from 'vitest';
vi.isolateModules(() => { /* … */ });`,
      );

      expect(
        await transformTestFile(`jest.doMock('./mod', () => ({ foo: 'bar' }));`),
      ).toBe(
        `\
import { vi } from 'vitest';
vi.doMock('./mod', () => ({ foo: 'bar' }));`,
      );

      expect(await transformTestFile(`jest.mocked(myFn);`)).toBe(
        `\
import { vi } from 'vitest';
vi.mocked(myFn);`,
      );

      expect(
        await transformTestFile(`const fn = jest.hoisted(() => () => 42);`),
      ).toBe(
        `\
import { vi } from 'vitest';
const fn = vi.hoisted(() => () => 42);`,
      );
    },
  );

  it('removes `jest.disableAutomock()` calls', async () => {
    expect(await transformTestFile(`jest.disableAutomock();`)).toBe('');
  });

  it('flags `jest.enableAutomock()` as unsupported', async () => {
    await expect(transformTestFile(`jest.enableAutomock();`)).rejects.toThrow();
  });

  it('rewrites `jest.useFakeTimers` to `vi.useFakeTimers`', async () => {
    expect(
      await transformTestFile(`\
beforeEach(() => {
  jest.useFakeTimers();
});`),
    ).toBe(
      `\
import { vi } from 'vitest';
beforeEach(() => {
  vi.useFakeTimers();
});`,
    );
  });

  it('rewrites `jest.useRealTimers` to `vi.useRealTimers`', async () => {
    expect(await transformTestFile(`jest.useRealTimers();`)).toBe(
      `\
import { vi } from 'vitest';
vi.useRealTimers();`,
    );
  });

  it(
    'rewrites `jest.advanceTimersByTimeAsync` to `vi.advanceTimersByTimeAsync`',
    async () => {
      expect(
        await transformTestFile(`await jest.advanceTimersByTimeAsync(0);`),
      ).toBe(
        `\
import { vi } from 'vitest';
await vi.advanceTimersByTimeAsync(0);`,
      );
    },
  );

  it(
    'rewrites `jest.runOnlyPendingTimersAsync` to `vi.runOnlyPendingTimersAsync`',
    async () => {
      expect(
        await transformTestFile(`await jest.runOnlyPendingTimersAsync();`),
      ).toBe(
        `\
import { vi } from 'vitest';
await vi.runOnlyPendingTimersAsync();`,
      );
    },
  );

  it(
    'rewrites `jest.runAllTimersAsync` to `vi.runAllTimersAsync`',
    async () => {
      expect(await transformTestFile(`await jest.runAllTimersAsync();`)).toBe(
        `\
import { vi } from 'vitest';
await vi.runAllTimersAsync();`,
      );
    },
  );

  it(
    'rewrites `jest.advanceTimersByTime` / `jest.runAllTimers` / `jest.runOnlyPendingTimers` to `vi.*` sync equivalents',
    async () => {
      expect(await transformTestFile(`jest.advanceTimersByTime(1000);`)).toBe(
        `\
import { vi } from 'vitest';
vi.advanceTimersByTime(1000);`,
      );

      expect(await transformTestFile(`jest.runAllTimers();`)).toBe(
        `\
import { vi } from 'vitest';
vi.runAllTimers();`,
      );

      expect(await transformTestFile(`jest.runOnlyPendingTimers();`)).toBe(
        `\
import { vi } from 'vitest';
vi.runOnlyPendingTimers();`,
      );
    },
  );

  it(
    'rewrites `jest.spyOn(global, setTimeout)` to `vi.spyOn(globalThis, setTimeout)`',
    async () => {
      expect(
        await transformTestFile(
          `const setTimeoutSpy = jest.spyOn(global, 'setTimeout');`,
        ),
      ).toBe(
        `\
import { vi } from 'vitest';
const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');`,
      );
    },
  );
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [jestViTransform],
  });
}

