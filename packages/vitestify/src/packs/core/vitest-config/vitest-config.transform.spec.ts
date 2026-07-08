import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { angularHeuristic } from '../angular.heuristic';
import { reactHeuristic } from '../react.heuristic';
import { domHeuristic } from '../dom.heuristic';
import { fileTags } from '../identifiers';
import { testingLibraryHeuristic } from '../testing-library-heuristic';
import { vitestConfigTransform } from './vitest-config.transform';

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

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toContain(`\
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
});
`);
  });

  it('installs vitest', async () => {
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

    await transform(workspace);

    expect(workspace.commands.all()).toContainEqual([
      'npm',
      'add',
      '-D',
      'vite-tsconfig-paths',
      'vitest',
    ]);
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

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toContain(`\
import { join } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
    setupFiles: [
      join(import.meta.dirname, "./vitest-jest.setup.ts"),
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

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toContain(`\
    setupFiles: [
      join(import.meta.dirname, "./vitest-global.setup.ts"),
      join(import.meta.dirname, "./vitest-jest.setup.ts"),
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

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.ts'),
      ),
    ).not.toBeNull();
  });

  it('does not generate vitest.config.mts when there is no jest config', async () => {
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toBeNull();
  });

  it('adds @testing-library/jest-dom/vitest to setup files when jest-dom is detected', async () => {
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

    await transform(workspace);

    let content = await workspace.tree.maybeReadFile(
      relativePath('apps/my-app/vitest.config.mts'),
    );
    /* Ignore other setup files. */
    content = content?.replace(/join\(.*/, '...') ?? null;

    expect(content).toContain(`\
    setupFiles: [
      ...
      '@testing-library/jest-dom/vitest',
    ],`);
  });

  it('generates angular vitest config when angular is detected', async () => {
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
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: `import { Component } from '@angular/core';`,
            fileName: 'app.component.ts',
            tags: [fileTags.code],
          }).build(),
        ),
    );

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/angular.setup.ts'),
      ),
    ).toBe(`\
import '@angular/compiler';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed();
`);

    const config = await workspace.tree.maybeReadFile(
      relativePath('apps/my-app/vitest.config.mts'),
    );

    expect
      .soft(config)
      .toContain(`import angular from '@analogjs/vite-plugin-angular';`);
    expect.soft(config).toContain(`plugins: [
    angular({ jit: false }),`);
    expect.soft(config).toContain(`\
    setupFiles: [
      join(import.meta.dirname, "./angular.setup.ts"),
    ],`);
  });

  it('installs analog angular packages when angular is detected', async () => {
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
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: `import { Component } from '@angular/core';`,
            fileName: 'app.component.ts',
            tags: [fileTags.code],
          }).build(),
        ),
    );

    await transform(workspace);

    expect(workspace.commands.all()).toContainEqual(
      expect.arrayContaining([
        'npm',
        '@analogjs/vite-plugin-angular',
        '@analogjs/vitest-angular',
      ]),
    );
  });

  it('does not generate angular.setup.ts when angular is absent', async () => {
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

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/angular.setup.ts'),
      ),
    ).toBeNull();
  });

  it('generates react vitest config when react is detected', async () => {
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
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: `import { useState } from 'react';`,
            fileName: 'app.tsx',
            tags: [fileTags.code],
          }).build(),
        ),
    );

    await transform(workspace);

    const config = await workspace.tree.maybeReadFile(
      relativePath('apps/my-app/vitest.config.mts'),
    );

    expect.soft(config).toContain(`import react from '@vitejs/plugin-react';`);
    expect.soft(config).toContain(`plugins: [
    react(),`);
  });

  it('installs @vitejs/plugin-react when react is detected', async () => {
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
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: `import { useState } from 'react';`,
            fileName: 'app.tsx',
            tags: [fileTags.code],
          }).build(),
        ),
    );

    await transform(workspace);

    expect(workspace.commands.all()).toContainEqual(
      expect.arrayContaining(['npm', '@vitejs/plugin-react']),
    );
  });

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

    await transform(workspace);

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

  it('configures jsdom when testing-library usage is detected', async () => {
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
            content: `import { screen } from '@testing-library/dom';`,
            fileName: 'app.spec.ts',
          }).build(),
        ),
    );

    await transform(workspace);

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

  it('configures jsdom when TestBed usage is detected', async () => {
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
            content: 'TestBed.configureTestingModule({});',
            fileName: 'app.component.spec.ts',
          }).build(),
        ),
    );

    await transform(workspace);

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

  it('maps jest moduleNameMapper entries to vitest resolve.alias', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: `\
export default {
  moduleNameMapper: {
    '^react-pdf$': '<rootDir>/__mocks__/react-pdf.js',
  },
};
`,
          fileName: 'jest.config.ts',
          tags: [fileTags.jestConfig],
        }).build(),
      ),
    );

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toContain(`\
  resolve: {
    alias: [
      {
        find: /^react-pdf$/,
        replacement: join(import.meta.dirname, '__mocks__/react-pdf.js'),
      },
    ],
  },
`);
  });

  it('generates testing-library.setup.ts when react testing library is detected', async () => {
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
            content: `import { render } from '@testing-library/react';`,
            fileName: 'src/app/app.spec.tsx',
          }).build(),
        ),
    );

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/testing-library.setup.ts'),
      ),
    ).toBe(`\
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
`);
  });

  it('adds testing-library.setup.ts to vitest config setup files', async () => {
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
            content: `import { render } from '@testing-library/react';`,
            fileName: 'src/app/app.spec.tsx',
          }).build(),
        ),
    );

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/vitest.config.mts'),
      ),
    ).toContain(`\
    setupFiles: [
      join(import.meta.dirname, "./testing-library.setup.ts"),
    ],`);
  });

  it('does not generate testing-library.setup.ts when react testing library is absent', async () => {
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

    await transform(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/testing-library.setup.ts'),
      ),
    ).toBeNull();
  });

  it('tags generated vitest config as vitest-config', async () => {
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

    await transform(workspace);

    expect(workspace.getFiles()).toContainEqual(
      expect.objectContaining({
        path: 'apps/my-app/vitest.config.mts',
        tags: ['vitest-config'],
      }),
    );
  });

  it('ignores workspace jest config files that define projects', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app')
        .withFile({
          path: relativePath('jest.config.ts'),
          content: `\
export default async (): Promise<Config> => ({
  somethingElse: 42,
  projects: await getJestProjectsAsync(),
});
`,
          tags: [fileTags.jestConfig],
        })
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'export default {}',
            fileName: 'jest.config.ts',
            tags: [fileTags.jestConfig],
          }).build(),
        ),
    );

    await transform(workspace);

    expect
      .soft(
        await workspace.tree.maybeReadFile(relativePath('vitest.config.mts')),
      )
      .toBeNull();

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/vitest.config.mts'),
        ),
      )
      .not.toBeNull();
  });
});

async function transform(workspace: ReturnType<typeof createTestingWorkspace>) {
  await runTransform({
    workspace,
    heuristics: [
      angularHeuristic,
      reactHeuristic,
      domHeuristic,
      testingLibraryHeuristic,
    ],
    transforms: [vitestConfigTransform],
  });
}
