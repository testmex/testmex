import { describe, expect, it } from 'vitest';
import { Tree } from '../../../core/domain/tree';
import { defineWorkspace } from '../../../core/domain/workspace';
import { relativePath } from '../../../core/models/relative-path';
import { WorkspaceInfo } from '../../../core/models/workspace-info';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { FileSystemFake } from '../../../core/ports/file-system.fake';
import { runTransform } from '../../../testing/run-transform';
import { fileTags } from '../identifiers';
import { vitestConfigTransform } from './vitest-config.transform';

const vitestConfigContent = `
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
});
`;

describe('vitest-config', () => {
  it('generates vitest.config.mts next to jest config', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'export default {}',
          fileName: 'jest.config.ts',
          tags: [fileTags.jestConfig],
        }).build(),
      ),
    );

    await runTransform({ workspace, transforms: [vitestConfigTransform] });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toContain(vitestConfigContent);
  });

  it('generates vitest.config.mts next to jest config outside project root', async () => {
    const fileSystem = new FileSystemFake();
    fileSystem.configure({
      [relativePath('libs/backend/jest.config.ts')]: 'export default {}',
    });

    const workspace = defineWorkspace({
      info: new WorkspaceInfo({
        projects: [
          { name: 'backend-core', path: relativePath('libs/backend/core') },
        ],
        files: [
          {
            path: relativePath('libs/backend/jest.config.ts'),
            tags: [fileTags.jestConfig],
          },
        ],
      }),
      tree: new Tree({ fileSystem }),
    });

    await runTransform({ workspace, transforms: [vitestConfigTransform] });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('libs/backend/vitest.config.mts'),
      ),
    ).toContain(vitestConfigContent);
    expect(
      await workspace.tree.maybeReadFile(
        relativePath('libs/backend/core/vitest.config.mts'),
      ),
    ).toBeNull();
  });

  it('skips directories that already have a vitest config', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'export default { test: { name: "custom" } };',
          fileName: 'vitest.config.ts',
        }).build(),
      ),
    );

    await runTransform({ workspace, transforms: [vitestConfigTransform] });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.ts'),
      ),
    ).not.toBeNull();
  });

  it('does not generate vitest.config.mts when there is no jest config', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));

    await runTransform({ workspace, transforms: [vitestConfigTransform] });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toBeNull();
  });
});
