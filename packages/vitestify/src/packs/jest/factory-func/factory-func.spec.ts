import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { factoryFuncTransform } from './factory-func-transform';

describe('factoryFunc', () => {
  it('wraps bare object literal in arrow factory for jest.setMock', async () => {
    expect(
      await transformTestFile(`jest.setMock('./module', { foo: 'bar' });`),
    ).toContain(`vi.mock('./module', () => ({ foo: 'bar' }));`);
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [factoryFuncTransform],
  });
}
