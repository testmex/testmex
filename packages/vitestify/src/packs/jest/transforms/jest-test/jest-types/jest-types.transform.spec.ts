import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../../../heuristics/jest-symbol/jest-symbol.heuristic';
import { transformTestFile as runTransformTestFile } from '../../../testing';
import { jestTypesTransform } from './jest-types.transform';

describe(jestTypesTransform.name, () => {
  it('replace jest.Mock type casts to Mock from vitest', async () => {
    expect(
      await transformTestFile(`(spy as jest.Mock).mockReturnValue(false);`),
    ).toBe(
      `\
import type { Mock } from 'vitest';
(spy as Mock).mockReturnValue(false);`,
    );
  });

  it('replace jest.MockedFunction to MockedFunction from vitest', async () => {
    expect(
      await transformTestFile(
        `const spy = myFn as jest.MockedFunction<typeof myFn>;`,
      ),
    ).toBe(
      `\
import type { MockedFunction } from 'vitest';
const spy = myFn as MockedFunction<typeof myFn>;`,
    );
  });

  it('replace jest.MockedFn to MockedFunction from vitest', async () => {
    expect(
      await transformTestFile(
        `const spy: jest.MockedFn<typeof myFn> = jest.fn();`,
      ),
    ).toBe(
      `\
import type { MockedFunction } from 'vitest';
const spy: MockedFunction<typeof myFn> = jest.fn();`,
    );
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [jestTypesTransform],
  });
}
