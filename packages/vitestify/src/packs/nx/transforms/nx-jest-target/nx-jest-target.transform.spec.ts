import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { runTransform } from '../../../../testing/run-transform';
import { nxJestTargetTransform } from './nx-jest-target.transform';

describe('nxJestTargetTransform', () => {
  it('renames test target to jest in project.json', async () => {
    expect(
      await transformProjectJson({
        name: 'my-app',
        targets: {
          build: { executor: '@nx/js:tsc' },
          test: { executor: '@nx/jest:jest' },
        },
      }),
    ).toMatchObject({
      targets: {
        build: { executor: '@nx/js:tsc' },
        jest: { executor: '@nx/jest:jest' },
      },
    });
  });

  it('skips when project.json has no test target', async () => {
    const { targets } = await transformProjectJson({
      name: 'my-app',
      targets: {
        build: { executor: '@nx/js:tsc' },
      },
    });

    expect(targets).toMatchObject({
      build: { executor: '@nx/js:tsc' },
    });
  });
});

async function transformProjectJson(
  content: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const appName = 'my-app';
  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.file({
        appName,
        content: JSON.stringify(content),
        fileName: 'project.json',
      }).build(),
    ),
  );

  await runTransform({ workspace, transforms: [nxJestTargetTransform] });

  return (await workspace.tree.maybeReadJsonFile(
    relativePath(`apps/${appName}/project.json`),
  )) as Record<string, unknown>;
}
