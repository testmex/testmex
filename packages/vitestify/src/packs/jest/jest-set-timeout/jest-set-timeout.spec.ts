import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { jestSetTimeoutTransform } from './jest-set-timeout-transform';
import { runTransform } from '../../../testing/run-transform';

describe('jestSetTimeout', () => {
  it(
    'detects and rewrites file top-level `jest.setTimeout` to `vi.setConfig`',
    async () => {
      const { transformTestFile } = setUp();

      expect(await transformTestFile(`jest.setTimeout(30_000);`)).toBe(
        `\
import { vi } from 'vitest';
vi.setConfig({ testTimeout: 30_000 });`,
      );
    },
  );

  it(
    'rewrites describe-scoped `jest.setTimeout` to `vi.setConfig` inside the describe block',
    async () => {
      const { transformTestFile } = setUp();

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
    },
  );

  it("adds `import { vi } from 'vitest'` when missing", async () => {
    const { transformTestFile } = setUp();

    expect(await transformTestFile(`jest.setTimeout(30_000);`)).toContain(
      `import { vi } from 'vitest';`,
    );
  });

  it('does not add a duplicate `vi` import when already present', async () => {
    const { transformTestFile } = setUp();

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

function setUp() {
  return {
    transformTestFile: async (content: string) => {
      const workspace = createTestingWorkspace(
        workspaceMother
          .withApp('my-app')
          .withAppFile('my-app', 'src/app.spec.ts', content),
      );
      await runTransform({
        workspace,
        heuristics: [jestSymbolHeuristic],
        transforms: [jestSetTimeoutTransform],
      });
      const file = workspace.info.projects[0].files[0];
      return await workspace.tree.maybeReadFile(file.path);
    },
  };
}
