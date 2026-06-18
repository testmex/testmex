import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { jestTypesTransform } from './jest-types-transform';
import { runTransform } from '../../../testing/run-transform';

describe('jestTypes', () => {
  it('replace jest.Mock type casts to Mock from vitest', async () => {
    const { transformTestFile } = setUp();

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
    const { transformTestFile } = setUp();

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
    const { transformTestFile } = setUp();

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

function setUp() {
  return {
    transformTestFile: async (content: string) => {
      const workspace = createTestingWorkspace(
        workspaceMother
          .withApp('my-app')
          .withAppFile('my-app', 'src/app.spec.ts', content),
      );
      await runTransform({
        workspace,
        heuristics: [jestSymbolHeuristic],
        transforms: [jestTypesTransform],
      });
      const file = workspace.info.projects[0].files[0];
      return await workspace.tree.maybeReadFile(file.path);
    },
  };
}
