import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { jestGlobalsImportTransform } from './jest-globals-import-transform';

describe('jestGlobalsImport', () => {
  it('replaces `@jest/globals` imports with vitest imports', async () => {
    expect(
      await transformTestFile(
        `import { describe, expect, it, jest } from '@jest/globals';`,
      ),
    ).toBe(`import { describe, expect, it, vi } from 'vitest';`);
  });

  it(
    "replaces `import … from 'jest'` with `import { vi } from 'vitest'`",
    async () => {
      expect(
        await transformTestFile(`import { jest } from 'jest';`),
      ).toBe(`import { vi } from 'vitest';`);
    },
  );
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [jestGlobalsImportTransform],
  });
}
