import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol.heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { jestSetTimeoutTransform } from './jest-set-timeout.transform';

describe(jestSetTimeoutTransform.name, () => {
  it('detects and rewrites file top-level `jest.setTimeout` to `vi.setConfig`', async () => {
    expect(await transformTestFile(`jest.setTimeout(30_000);`)).toBe(
      `\
import { vi } from 'vitest';
vi.setConfig({ testTimeout: 30_000 });`,
    );
  });

  it('rewrites describe-scoped `jest.setTimeout` to `vi.setConfig` inside the describe block', async () => {
    expect(
      await transformTestFile(`\
describe('Nominal case', () => {
  jest.setTimeout(10_000);
  it('should sync agency successfully and return 204', async () => { /* … */ });
});`),
    ).toBe(
      `\
import { vi } from 'vitest';
describe('Nominal case', () => {
  vi.setConfig({ testTimeout: 10_000 });
  it('should sync agency successfully and return 204', async () => { /* … */ });
});`,
    );
  });

  it("adds `import { vi } from 'vitest'` when missing", async () => {
    expect(await transformTestFile(`jest.setTimeout(30_000);`)).toContain(
      `import { vi } from 'vitest';`,
    );
  });

  it('does not add a duplicate `vi` import when already present', async () => {
    expect(
      await transformTestFile(`\
import { vi } from 'vitest';
jest.setTimeout(30_000);`),
    ).toBe(
      `\
import { vi } from 'vitest';
vi.setConfig({ testTimeout: 30_000 });`,
    );
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [jestSetTimeoutTransform],
  });
}
