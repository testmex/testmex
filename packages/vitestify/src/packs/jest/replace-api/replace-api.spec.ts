import { describe, expect, it } from 'vitest';
import { transformTestFile as runTransformTestFile } from '../testing';
import { replaceApiHeuristic } from './replace-api.heuristic';
import { replaceApiTransform } from './replace-api.transform';

describe('replaceApi', () => {
  it('rewrites `fit(` → `it.only(`', async () => {
    expect(
      await transformTestFile(
        `fit('should manage grouping', async () => { /* … */ });`,
      ),
    ).toBe(`it.only('should manage grouping', async () => { /* … */ });`);
  });

  it(
    'rewrites `fit.each` / `fit.failing` → `it.only.each` / `it.only.fails`',
    async () => {
      expect(
        await transformTestFile(
          `fit.failing('focused expected failure', () => { /* … */ });`,
        ),
      ).toBe(
        `it.only.fails('focused expected failure', () => { /* … */ });`,
      );

      expect(
        await transformTestFile(
          `fit.each(cases)('case %s', (input) => { /* … */ });`,
        ),
      ).toBe(`it.only.each(cases)('case %s', (input) => { /* … */ });`);
    },
  );

  it(
    'rewrites `it.failing` / `test.failing` → `it.fails` / `test.fails`',
    async () => {
      expect(
        await transformTestFile(`\
it.failing('Should not fetch public views is user is not a member', async () => {
  /* … */
});`),
      ).toBe(`\
it.fails('Should not fetch public views is user is not a member', async () => {
  /* … */
});`);

      expect(
        await transformTestFile(`\
test.failing('Should not fetch public views is user is not a member', async () => {
  /* … */
});`),
      ).toBe(`\
test.fails('Should not fetch public views is user is not a member', async () => {
  /* … */
});`);
    },
  );

  it(
    'rewrites `(it|test).only.failing` / `.skip.failing` → `.fails`',
    async () => {
      expect(
        await transformTestFile(
          `it.only.failing('focused failure case', () => { throw new Error('nope'); });`,
        ),
      ).toBe(
        `it.only.fails('focused failure case', () => { throw new Error('nope'); });`,
      );

      expect(
        await transformTestFile(
          `it.skip.failing('skipped failure case', () => { throw new Error('nope'); });`,
        ),
      ).toBe(
        `it.skip.fails('skipped failure case', () => { throw new Error('nope'); });`,
      );

      expect(
        await transformTestFile(
          `test.only.failing('focused failure case', () => { throw new Error('nope'); });`,
        ),
      ).toBe(
        `test.only.fails('focused failure case', () => { throw new Error('nope'); });`,
      );

      expect(
        await transformTestFile(
          `test.skip.failing('skipped failure case', () => { throw new Error('nope'); });`,
        ),
      ).toBe(
        `test.skip.fails('skipped failure case', () => { throw new Error('nope'); });`,
      );
    },
  );

  it('rewrites `xit(` → `it.skip(`', async () => {
    expect(
      await transformTestFile(
        `xit('should restart a pending signature and return new draft signature id', async () => { /* … */ });`,
      ),
    ).toBe(
      `it.skip('should restart a pending signature and return new draft signature id', async () => { /* … */ });`,
    );
  });

  it('rewrites `xdescribe(` → `describe.skip(`', async () => {
    expect(
      await transformTestFile(`xdescribe('legacy flow', () => { /* … */ });`),
    ).toBe(`describe.skip('legacy flow', () => { /* … */ });`);
  });

  it('rewrites `xtest(` → `test.skip(`', async () => {
    expect(
      await transformTestFile(`xtest('skipped', () => { /* … */ });`),
    ).toBe(`test.skip('skipped', () => { /* … */ });`);
  });

  it('rewrites `fdescribe(` → `describe.only(`', async () => {
    expect(
      await transformTestFile(`fdescribe('focused suite', () => { /* … */ });`),
    ).toBe(`describe.only('focused suite', () => { /* … */ });`);
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [replaceApiHeuristic],
    transforms: [replaceApiTransform],
  });
}
