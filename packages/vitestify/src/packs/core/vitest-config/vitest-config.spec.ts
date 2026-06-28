import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
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
