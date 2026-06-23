import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { Transformer } from '../../../pipeline/transformer';
import { vitestConfigTransform } from './vitest-config.transform';

describe('vitestConfigTransform', () => {
  it('generates vitest.config.ts at the root of each project', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'export default {}',
          fileName: 'jest.config.ts',
        }).build(),
      ),
    );

    await new Transformer({ transforms: [vitestConfigTransform] }).transform({
      findings: [],
      workspace,
    });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.ts'),
      ),
    ).toContain('export default defineConfig');
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

    await new Transformer({ transforms: [vitestConfigTransform] }).transform({
      findings: [],
      workspace,
    });

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.ts'),
      ),
    ).toBe('export default { test: { name: "custom" } };');
  });
});
