import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../core/workspace.mother';
import { jestMockHeuristic } from './jest-mock-heuristic';
import { jestMockTransform } from './jest-mock-transform';

describe('jestMock', () => {
  it('detects and rewrites `jest.mock` to `vi.mock` via the Tree', async () => {
    const { file, workspace } = setUp();

    const findings = await jestMockHeuristic.inspect(workspace);
    await jestMockTransform.apply({ findings, workspace });

    expect(await workspace.tree.maybeReadFile(file.path)).toBe(
      "vi.mock('./foo');",
    );
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
