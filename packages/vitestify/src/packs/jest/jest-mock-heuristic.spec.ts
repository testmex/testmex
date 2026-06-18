import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../core/workspace.mother';
import { jestMockHeuristic } from './jest-mock-heuristic';

describe('jestMockHeuristic', () => {
  it('heuristic detects `jest.mock` usage', async () => {
    const { project, file, workspace } = setUp();

    const findings = await jestMockHeuristic.inspect(workspace);

    expect(findings).toEqual([
      {
        type: 'jest-mock-call',
        tags: ['jest'],
        description: expect.any(String),
        project,
        file,
      },
    ]);
  });
});

function setUp() {
  const workspace = createTestingWorkspace(workspaceMother
    .withApp('my-app')
    .withAppFile('my-app', 'src/app.spec.ts', "jest.mock('./foo');"));
  const project = workspace.info.projects[0];
  const file = project.files[0];

  return {
    file,
    project,
    workspace,
  };
}
