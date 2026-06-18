import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { defaultExportsTransform } from './default-exports-transform';

describe('defaultExports', () => {
  it(
    'wraps concise arrow mock factory returning a value as `{ default: … }`',
    async () => {
      expect(
        await transformTestFile(`jest.mock('./logger', () => jest.fn());`),
      ).toBe(`jest.mock('./logger', () => ({ default: jest.fn() }));`);
    },
  );

  it('wraps block-body mock factory final return as `{ default: … }`', async () => {
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
    const input = `\
jest.mock('./utils', () => {
  return {
    cleanPdf: () => new Uint8Array(),
    isValidPdf: () => true
  };
});`;

    expect(
      await transformTestFile(input, {
        'src/utils.ts': `\
export const cleanPdf = () => new Uint8Array();
export const isValidPdf = () => true;`,
      }),
    ).toBe(input);
  });

  it('skips wrapping when `{ default: … }` is already present', async () => {
    const input = `jest.mock('./mod', () => ({ default: () => 'ok' }));`;

    expect(await transformTestFile(input)).toBe(input);
  });
});

function transformTestFile(
  content: string,
  extraFiles?: Record<string, string>,
) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [defaultExportsTransform],
    extraFiles,
  });
}
