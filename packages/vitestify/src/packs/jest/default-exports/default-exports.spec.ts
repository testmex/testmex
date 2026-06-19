import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { defaultExportsTransform } from './default-exports-transform';

describe('defaultExports', () => {
  it('wraps concise arrow mock factory returning a value as `{ default: … }`', async () => {
    expect(
      await transformTestFile(`jest.mock('./logger', () => jest.fn());`),
    ).toBe(`jest.mock('./logger', () => ({ default: jest.fn() }));`);
  });

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

  it('wraps block-body mock factory multiple returns as `{ default: … }`', async () => {
    expect(
      await transformTestFile(`\
jest.mock('./mod', () => {
  if (condition) {
    return function a() { return 'A'; };
  }
  return function b() { return 'B'; };
});`),
    ).toBe(`\
jest.mock('./mod', () => {
  if (condition) {
    return { default: function a() { return 'A'; } };
  }
  return { default: function b() { return 'B'; } };
});`);
  });

  it('skips wrapping when `{ default: … }` is already present', async () => {
    const input = `jest.mock('./mod', () => ({ default: () => 'ok' }));`;

    expect(await transformTestFile(input)).toBe(
      `jest.mock('./mod', () => ({ default: () => 'ok' }));`,
    );
  });

  it('skips wrapping when `{ default: … }` is returned', async () => {
    const input = `\
jest.mock('./mod', () => {
  if (condition) {
    return {
      default: function a() { return 'A'; },
      xyz: 42,
    };
  }
  return function b() { return 'B'; };
});`;

    expect(await transformTestFile(input)).toBe(`\
jest.mock('./mod', () => {
  if (condition) {
    return {
      default: function a() { return 'A'; },
      xyz: 42,
    };
  }
  return { default: function b() { return 'B'; } };
});`);
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [defaultExportsTransform],
  });
}
