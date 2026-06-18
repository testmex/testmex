import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { jestGlobalsImportTransform } from './jest-globals-import-transform';
import { runTransform } from '../../../testing/run-transform';

describe('jestGlobalsImport', () => {
  it('replaces `@jest/globals` imports with vitest imports', async () => {
    const { transformTestFile } = setUp();

    expect(
      await transformTestFile(
        `import { describe, expect, it, jest } from '@jest/globals';`,
      ),
    ).toBe(`import { describe, expect, it, vi } from 'vitest';`);
  });

  it(
    "replaces `import … from 'jest'` with `import { vi } from 'vitest'`",
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`import { jest } from 'jest';`),
      ).toBe(`import { vi } from 'vitest';`);
    },
  );
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
        transforms: [jestGlobalsImportTransform],
      });
      const file = workspace.info.projects[0].files[0];
      return await workspace.tree.maybeReadFile(file.path);
    },
  };
}
