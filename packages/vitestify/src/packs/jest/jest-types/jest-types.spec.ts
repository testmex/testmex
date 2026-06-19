import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol.heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { jestTypesTransform } from './jest-types.transform';

describe('jestTypes', () => {
  it('replace jest.Mock type casts to Mock from vitest', async () => {
    expect(
      await transformTestFile(
        `(canSyncAgencyCode as jest.Mock).mockReturnValue(false);`,
      ),
    ).toBe(
      `\
import type { Mock } from 'vitest';
(canSyncAgencyCode as Mock).mockReturnValue(false);`,
    );
  });

  it('replace jest.MockedFunction to MockedFunction from vitest', async () => {
    expect(
      await transformTestFile(
        `const sanitizeEmailHtmlSpy = sanitizeHtml as jest.MockedFunction<typeof sanitizeHtml>;`,
      ),
    ).toBe(
      `\
import type { MockedFunction } from 'vitest';
const sanitizeEmailHtmlSpy = sanitizeHtml as MockedFunction<typeof sanitizeHtml>;`,
    );
  });

  it('replace jest.MockedFn to MockedFunction from vitest', async () => {
    expect(
      await transformTestFile(
        `const spy: jest.MockedFn<typeof AuthorizationBase.prototype.isAuthorized> = jest.fn();`,
      ),
    ).toBe(
      `\
import type { MockedFunction } from 'vitest';
const spy: MockedFunction<typeof AuthorizationBase.prototype.isAuthorized> = jest.fn();`,
    );
  });
});

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [jestTypesTransform],
  });
}
