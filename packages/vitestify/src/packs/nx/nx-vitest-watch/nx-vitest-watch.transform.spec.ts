import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { fileTags } from '../../core/identifiers';
import { nxVitestWatchTransform } from './nx-vitest-watch.transform';

describe(nxVitestWatchTransform.name, () => {
  it('adds watch: false to the test block', async () => {
    const result = await transformVitestConfig(`\
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
});
`);

    expect(result).toContain(`\
  test: {
    watch: false,
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
`);
  });

  it('skips when watch is already set', async () => {
    const result = await transformVitestConfig(`\
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: undefined,
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
});
`);

    expect(result).toContain(`\
  test: {
    watch: undefined,
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
`);
  });
});

async function transformVitestConfig(content: string): Promise<string> {
  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content,
        fileName: 'vitest.config.mts',
        tags: [fileTags.vitestConfig],
      }).build(),
    ),
  );

  await runTransform({ workspace, transforms: [nxVitestWatchTransform] });

  return (await workspace.tree.maybeReadFile(
    relativePath('apps/my-app/vitest.config.mts'),
  )) as string;
}
