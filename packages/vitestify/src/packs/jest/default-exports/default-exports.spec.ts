import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { relativePath } from '../../../core/models/relative-path';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { defaultExportsTransform } from './default-exports-transform';
import { runTransform } from '../../../testing/run-transform';

describe('defaultExports', () => {
  it(
    'wraps concise arrow mock factory returning a value as `{ default: … }`',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`jest.mock('./logger', () => jest.fn());`),
      ).toBe(`jest.mock('./logger', () => ({ default: jest.fn() }));`);
    },
  );

  it('wraps block-body mock factory final return as `{ default: … }`', async () => {
    const { transformTestFile } = setUp();

    expect(
      await transformTestFile(`\
jest.mock('./logger', () => {
  return function logger() { return 'log'; };
});`),
    ).toBe(`\
jest.mock('./logger', () => {
  return { default: function logger() { return 'log'; } };
});`);
  });

  it('skips wrapping when resolved module is an object namespace', async () => {
    const { transformTestFile } = setUp({
      files: {
        'src/utils.ts': `\
export const cleanPdf = () => new Uint8Array();
export const isValidPdf = () => true;`,
      },
    });

    const input = `\
jest.mock('./utils', () => {
  return {
    cleanPdf: () => new Uint8Array(),
    isValidPdf: () => true
  };
});`;

    expect(await transformTestFile(input)).toBe(input);
  });

  it('skips wrapping when `{ default: … }` is already present', async () => {
    const { transformTestFile } = setUp();

    const input = `jest.mock('./mod', () => ({ default: () => 'ok' }));`;

    expect(await transformTestFile(input)).toBe(input);
  });
});

function setUp(options?: { files?: Record<string, string> }) {
  return {
    transformTestFile: async (content: string) => {
      let mother = workspaceMother.withApp('my-app');

      for (const [fileName, fileContent] of Object.entries(
        options?.files ?? {},
      )) {
        mother = mother.withAppFile('my-app', fileName, fileContent);
      }

      const workspace = createTestingWorkspace(
        mother.withAppFile('my-app', 'src/app.spec.ts', content),
      );
      await runTransform({
        workspace,
        heuristics: [jestSymbolHeuristic],
        transforms: [defaultExportsTransform],
      });
      const specPath = relativePath('apps/my-app/src/app.spec.ts');
      return await workspace.tree.maybeReadFile(specPath);
    },
  };
}
