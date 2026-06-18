import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../core/models/workspace.mother';
import { jestMockHeuristic } from './jest-mock-heuristic';
import { jestMockTransform } from './jest-mock-transform';

describe('jestMock', () => {
  it('detects and rewrites `jest.mock` to `vi.mock` via the Tree', async () => {
    const { file, workspace } = setUp();

    const findings = await jestMockHeuristic.inspect(workspace);
    await jestMockTransform.apply({ findings, workspace });

    expect(await workspace.tree.maybeReadFile(file.path)).toBe(
      `\
import { vi } from 'vitest';
vi.mock('./foo');`,
    );
  });

  it("adds `import { vi } from 'vitest'` when missing", async () => {
    const { file, workspace } = setUp();

    const findings = await jestMockHeuristic.inspect(workspace);
    await jestMockTransform.apply({ findings, workspace });

    expect(await workspace.tree.maybeReadFile(file.path)).toContain(
      `import { vi } from 'vitest';`,
    );
  });

  it('does not add a duplicate `vi` import when already present', async () => {
    const workspace = createTestingWorkspace(
      workspaceMother.withApp('my-app').withAppFile(
        'my-app',
        'src/app.spec.ts',
        `\
import { vi } from 'vitest';
jest.mock('./foo');`,
      ),
    );
    const file = workspace.info.projects[0].files[0];

    const findings = await jestMockHeuristic.inspect(workspace);
    await jestMockTransform.apply({ findings, workspace });

    const lines = (await workspace.tree.maybeReadFile(file.path))?.split('\n');
    expect(lines).toHaveLength(2);
  });
});

function setUp() {
  const workspace = createTestingWorkspace(
    workspaceMother
      .withApp('my-app')
      .withAppFile('my-app', 'src/app.spec.ts', "jest.mock('./foo');"),
  );
  const project = workspace.info.projects[0];
  const file = project.files[0];

  return {
    file,
    project,
    workspace,
  };
}
