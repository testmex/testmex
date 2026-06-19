import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol.heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { jestMockTransform } from './jest-mock.transform';

describe('jestMock', () => {
  it('detects and rewrites `jest.mock` to `vi.mock`', async () => {
    expect(await transformTestFile(`jest.mock('./foo');`)).toContain(
      `vi.mock('./foo');`,
    );
  });

  it('rewrites partial mocks with jest.requireActual spread to async vi.importActual', async () => {
    expect(
      await transformTestFile(`\
jest.mock('./my-module', () => ({
  ...jest.requireActual('./my-module'),
  canCook: () => true,
}));`),
    ).toContain(
      `\
vi.mock('./my-module', async () => ({
  ...(await vi.importActual('./my-module')),
  canCook: () => true,
}));`,
    );
  });

  it('wraps concise arrow mock factory returning a value as `{ default: … }`', async () => {
    expect(await transformTestFile(`jest.mock('./logger', () => jest.fn());`))
      .toBe(`\
import { vi } from 'vitest';
vi.mock('./logger', () => ({ default: jest.fn() }));`);
  });

  it('wraps block-body mock factory final return as `{ default: … }`', async () => {
    expect(
      await transformTestFile(`\
jest.mock('./logger', () => {
  return function logger() { return 'log'; };
});`),
    ).toContain(`\
vi.mock('./logger', () => {
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
    ).toContain(`\
vi.mock('./mod', () => {
  if (condition) {
    return { default: function a() { return 'A'; } };
  }
  return { default: function b() { return 'B'; } };
});`);
  });

  it('skips wrapping when `{ default: … }` is already present', async () => {
    const input = `jest.mock('./mod', () => ({ default: () => 'ok' }));`;

    expect(await transformTestFile(input)).toContain(
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

    expect(await transformTestFile(input)).toContain(`\
vi.mock('./mod', () => {
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
    transforms: [jestMockTransform],
  });
}
