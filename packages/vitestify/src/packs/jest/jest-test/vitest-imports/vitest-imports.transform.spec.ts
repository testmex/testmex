import { describe, expect, it } from 'vitest';
import { transformTestFile as runTransformTestFile } from '../../testing';
import { vitestImportsNeededHeuristic } from './vitest-imports-needed.heuristic';
import { vitestImportsTransform } from './vitest-imports.transform';

describe(vitestImportsTransform.name, () => {
  it('adds import for describe', async () => {
    expect(
      await transformTestFile(`\
describe('suite', () => {});
`),
    ).toBe(`\
import { describe } from 'vitest';
describe('suite', () => {});
`);
  });

  it('adds import for it', async () => {
    expect(
      await transformTestFile(`\
it('case', () => {});
`),
    ).toBe(`\
import { it } from 'vitest';
it('case', () => {});
`);
  });

  it('adds import for test', async () => {
    expect(
      await transformTestFile(`\
test('case', () => {});
`),
    ).toBe(`\
import { test } from 'vitest';
test('case', () => {});
`);
  });

  it('adds import for expect', async () => {
    expect(
      await transformTestFile(`\
expect(true).toBe(true);
`),
    ).toBe(`\
import { expect } from 'vitest';
expect(true).toBe(true);
`);
  });

  it('adds import for beforeAll', async () => {
    expect(
      await transformTestFile(`\
beforeAll(() => {});
`),
    ).toBe(`\
import { beforeAll } from 'vitest';
beforeAll(() => {});
`);
  });

  it('adds import for afterAll', async () => {
    expect(
      await transformTestFile(`\
afterAll(() => {});
`),
    ).toBe(`\
import { afterAll } from 'vitest';
afterAll(() => {});
`);
  });

  it('adds import for beforeEach', async () => {
    expect(
      await transformTestFile(`\
beforeEach(() => {});
`),
    ).toBe(`\
import { beforeEach } from 'vitest';
beforeEach(() => {});
`);
  });

  it('adds import for afterEach', async () => {
    expect(
      await transformTestFile(`\
afterEach(() => {});
`),
    ).toBe(`\
import { afterEach } from 'vitest';
afterEach(() => {});
`);
  });

  it('does not rewrite it.todo (imports it only)', async () => {
    expect(
      await transformTestFile(`\
it.todo('implement later');
`),
    ).toBe(`\
import { it } from 'vitest';
it.todo('implement later');
`);
  });

  it('does not rewrite test.todo (imports test only)', async () => {
    expect(
      await transformTestFile(`\
test.todo('also later');
`),
    ).toBe(`\
import { test } from 'vitest';
test.todo('also later');
`);
  });

  it('does not rewrite it.concurrent (imports it only)', async () => {
    expect(
      await transformTestFile(`\
it.concurrent('runs in parallel', async () => { /* … */ });
`),
    ).toBe(`\
import { it } from 'vitest';
it.concurrent('runs in parallel', async () => { /* … */ });
`);
  });

  it('does not rewrite test.concurrent (imports test only)', async () => {
    expect(
      await transformTestFile(`\
test.concurrent('also parallel', async () => { /* … */ });
`),
    ).toBe(`\
import { test } from 'vitest';
test.concurrent('also parallel', async () => { /* … */ });
`);
  });

  it('does not rewrite describe.skip (imports describe only)', async () => {
    expect(
      await transformTestFile(`\
describe.skip('legacy suite', () => { /* … */ });
`),
    ).toBe(`\
import { describe } from 'vitest';
describe.skip('legacy suite', () => { /* … */ });
`);
  });

  it('does not rewrite describe.only (imports describe only)', async () => {
    const content = await transformTestFile(
      `describe.only('focused suite', () => { /* … */ });`,
    );
    /* Keep the assertions inlined.
     * WallabyJS detects `describe.only` with a regexp so if the line starts with it.
     * Other files are excluded.
     * Cf. https://github.com/wallabyjs/public/issues/3643 */
    expect.soft(content).toContain(`import { describe } from 'vitest';`);
    expect
      .soft(content)
      .toContain(`describe.only('focused suite', () => { /* … */ });`);
  });

  it('does not rewrite describe.each (imports describe only)', async () => {
    expect(
      await transformTestFile(`\
const cases = [1, 2];
describe.each(cases)('case %s', (input) => { /* … */ });
`),
    ).toBe(`\
import { describe } from 'vitest';
const cases = [1, 2];
describe.each(cases)('case %s', (input) => { /* … */ });
`);
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [vitestImportsNeededHeuristic],
    transforms: [vitestImportsTransform],
  });
}
