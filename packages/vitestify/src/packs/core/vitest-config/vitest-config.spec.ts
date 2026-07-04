import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { domHeuristic } from '../dom.heuristic';
import { fileTags } from '../identifiers';
import { testingLibraryJestDomHeuristic } from '../testing-library-jest-dom/testing-library-jest-dom.heuristic';
import { vitestConfigTransform } from './vitest-config.transform';

const vitestConfigContent = `\
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

  it('reuses jest setup files in vitest config', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `\
export default {
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
`,
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
    ).toContain(`\
import { join } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
    setupFiles: [
      join(import.meta.dirname, "./jest.setup.ts"),
    ],
  },
});
`);
  });

  it('merges setupFiles and setupFilesAfterEnv from jest config', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `\
module.exports = {
  setupFiles: ['<rootDir>/global.setup.ts'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
`,
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
    ).toContain(`\
    setupFiles: [
      join(import.meta.dirname, "./global.setup.ts"),
      join(import.meta.dirname, "./jest.setup.ts"),
    ],`);
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

  it.todo(
    'adds @testing-library/jest-dom/vitest to setup files when jest-dom is detected',
    async () => {
      const workspace = createTestingWorkspace(
        WorkspaceMother.withApp('my-app')
          .withFile(
            WorkspaceFileMother.file({
              appName: 'my-app',
              content: `\
export default {
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
`,
              fileName: 'jest.config.ts',
              tags: [fileTags.jestConfig],
            }).build(),
          )
          .withFile(
            WorkspaceFileMother.file({
              appName: 'my-app',
              content: `import '@testing-library/jest-dom';`,
              fileName: 'jest.setup.ts',
              tags: [fileTags.code],
            }).build(),
          ),
      );

      await runTransform({
        workspace,
        heuristics: [testingLibraryJestDomHeuristic],
        transforms: [vitestConfigTransform],
      });

      let content = await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      );
      /* Ignore other setup files. */
      content = content?.replace(/join\(.*/, '...') ?? null;

      expect(content).toContain(`
      setupFiles: [
        ...
        '@testing-library/jest-dom/vitest',
      ],
    `);
    },
  );

  it('configures jsdom when dom tests are detected', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app')
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'jest.config.ts',
            tags: [fileTags.jestConfig],
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.testFile({
            appName: 'my-app',
            content: 'document.body.innerHTML = "";',
            fileName: 'app.spec.ts',
          }).build(),
        ),
    );

    await runTransform({
      workspace,
      heuristics: [domHeuristic],
      transforms: [vitestConfigTransform],
    });

    const config = await workspace.tree.maybeReadFile(
      relativePath('apps/my-app/vitest.config.mts'),
    );

    expect(config?.replace(/include: \[.+\]/, 'include: [...]')).toContain(`\
  test: {
    environment: 'jsdom',
    include: [...],
  },
`);
  });
});
