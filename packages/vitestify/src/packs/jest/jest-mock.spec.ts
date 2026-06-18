import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../core/models/workspace.mother';
import { jestMockHeuristic } from './jest-mock-heuristic';
import { jestMockTransform } from './jest-mock-transform';
import { runTransform } from '../../testing/run-transform';

describe('jestMock', () => {
  it('detects and rewrites `jest.mock` to `vi.mock` via the Tree', async () => {
    const { transformTestFile } = setUp();

    expect(await transformTestFile(`jest.mock('./foo');`)).toBe(
      `\
import { vi } from 'vitest';
vi.mock('./foo');`,
    );
  });

  it("adds `import { vi } from 'vitest'` when missing", async () => {
    const { transformTestFile } = setUp();

    expect(await transformTestFile(`jest.mock('./foo');`)).toContain(
      `import { vi } from 'vitest';`,
    );
  });

  it('does not add a duplicate `vi` import when already present', async () => {
    const { transformTestFile } = setUp();

    expect(
      await transformTestFile(`\
import { vi } from 'vitest';
jest.mock('./foo');`),
    ).toBe(
      `\
import { vi } from 'vitest';
vi.mock('./foo');`,
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
        heuristics: [jestMockHeuristic],
        transforms: [jestMockTransform],
      });
      const file = workspace.info.projects[0].files[0];
      return await workspace.tree.maybeReadFile(file.path);
    },
  };
}
