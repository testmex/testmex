import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { vitestConfigTransform } from './vitest-config.transform';

describe('vitestConfigTransform', () => {
  it('generates vitest.config.mts at the root of each project', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'export default {}',
          fileName: 'jest.config.ts',
        }).build(),
      ),
    );

    await runTransform({ workspace, transforms: [vitestConfigTransform] });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toContain(`
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
});
`);
  });

  it('skips projects that already have a vitest config', async () => {
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
    ).toBe('export default { test: { name: "custom" } };');
  });
});
