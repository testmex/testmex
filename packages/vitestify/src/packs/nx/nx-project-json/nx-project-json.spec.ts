import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { nxProjectJsonTransform } from './nx-project-json.transform';

describe('nxProjectJsonTransform', () => {
  it('removes test target from project.json', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: JSON.stringify({
            name: 'my-app',
            targets: {
              build: { executor: '@nx/js:tsc' },
              test: { executor: '@nx/jest:jest' },
            },
          }),
          fileName: 'project.json',
        }).build(),
      ),
    );

    await runTransform({ workspace, transforms: [nxProjectJsonTransform] });

    expect(
      await workspace.tree.maybeReadJsonFile(
        relativePath('apps/my-app/project.json'),
      ),
    ).toEqual({
      name: 'my-app',
      targets: {
        build: { executor: '@nx/js:tsc' },
      },
    });
  });

  it('skips when project.json has no test target', async () => {
    const content = JSON.stringify({
      name: 'my-app',
      targets: {
        build: { executor: '@nx/js:tsc' },
      },
    });
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content,
          fileName: 'project.json',
        }).build(),
      ),
    );

    await runTransform({ workspace, transforms: [nxProjectJsonTransform] });

    expect(
      await workspace.tree.maybeReadJsonFile(
        relativePath('apps/my-app/project.json'),
      ),
    ).toEqual({
      name: 'my-app',
      targets: {
        build: { executor: '@nx/js:tsc' },
      },
    });
  });

  it('skips when project.json is missing', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));

    await runTransform({ workspace, transforms: [nxProjectJsonTransform] });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/project.json'),
      ),
    ).toBeNull();
  });
});
