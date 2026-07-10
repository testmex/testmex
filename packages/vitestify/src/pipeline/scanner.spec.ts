import { describe, expect, it } from 'vitest';
import { relativePath } from '../core/models/relative-path';
import { type Project } from '../core/domain/workspace';
import { CommandRunnerFake } from '../core/ports/command-runner.fake';
import { FileSystemFake } from '../core/ports/file-system.fake';
import angularCliPack from '../packs/angular-cli';
import { angularCliWorkspaceMother } from '../packs/angular-cli/angular-cli-workspace-infra.mother';
import corePack from '../packs/core';
import jestPack from '../packs/jest';
import nxPack from '../packs/nx';
import { nxWorkspaceMother } from '../packs/nx/nx-workspace-infra.mother';
import type { ProgressReporter } from '../core/ports/progress-reporter';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
import { Scanner } from './scanner';

describe(Scanner.name, () => {
  it('detects angular cli project', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(angularCliWorkspaceMother.withApp('my-app'));

    const workspace = await scanner.scanWorkspace();

    expect.soft(workspace.info.projects).toMatchObject([
      {
        name: 'my-app',
        path: relativePath('apps/my-app'),
      } satisfies Partial<Project>,
    ]);
  });

  it('detects nx project', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(nxWorkspaceMother.withApp('my-app'));

    const workspace = await scanner.scanWorkspace();

    expect.soft(workspace.info.projects).toMatchObject([
      {
        name: 'my-app',
        path: relativePath('apps/my-app'),
      },
    ]);
  });

  it('enriches nx project with jest config', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(
      nxWorkspaceMother
        .withApp('my-app')
        .withAppFile('my-app', 'jest.config.ts', 'export default {}'),
    );

    const workspace = await scanner.scanWorkspace();

    expect(workspace.getProjectFiles('my-app')).toMatchObject([
      {
        path: relativePath('apps/my-app/jest.config.ts'),
        tags: ['jest-config'],
      },
    ]);
  });

  it('enriches nx project with test files', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(
      nxWorkspaceMother
        .withApp('my-app')
        .withAppFile('my-app', 'src/app.spec.ts', 'it("works", () => {})'),
    );

    const workspace = await scanner.scanWorkspace();

    expect(workspace.getProjectFiles('my-app')).toMatchObject([
      {
        path: relativePath('apps/my-app/src/app.spec.ts'),
        tags: ['test'],
      },
    ]);
  });

  it('scanner reports enricher name and file count from enricher callbacks', async () => {
    const progressReporter = new ProgressReporterFake();
    const { configureWorkspace, scanner } = setUp({ progressReporter });

    configureWorkspace(
      nxWorkspaceMother
        .withApp('my-app')
        .withAppFile('my-app', 'src/one.spec.ts', 'it("one", () => {})')
        .withAppFile('my-app', 'src/two.spec.ts', 'it("two", () => {})')
        .withAppFile('my-app', 'src/three.spec.ts', 'it("three", () => {})')
        .withAppFile('my-app', 'src/four.spec.ts', 'it("four", () => {})')
        .withAppFile('my-app', 'src/five.spec.ts', 'it("five", () => {})'),
    );

    await scanner.scanWorkspace();

    const codeMessages = progressReporter
      .messages()
      .filter((message) => message.includes('code'));

    expect(codeMessages.some((message) => message.includes('1'))).toBe(true);
    expect(codeMessages.some((message) => message.includes('2'))).toBe(true);
    expect(codeMessages.some((message) => message.includes('3'))).toBe(true);
    expect(codeMessages.some((message) => message.includes('4'))).toBe(true);
    expect(codeMessages.some((message) => message.includes('5'))).toBe(true);
  });

  it.todo('scanner calls done once per enricher', async () => {
    // Set up `Scanner` with `ProgressReporterFake`.
    // Run `scanWorkspace()` on a workspace with known enricher count.
    // Assert `done` was called once per enricher (not only those that scan files).
  });

  it.todo('non-scanning enricher reports contextual status', async () => {
    // Set up `Scanner` with `ProgressReporterFake` and a workspace that triggers `NxEnricher`.
    // Run `scanWorkspace()`.
    // Assert messages contain `'nx'` and `'running nx graph'`.
  });

  it(
    'detects folder with jest.config.ts as project when no nx project exists at that path',
    async () => {
      const { configureWorkspace, scanner } = setUp();

      configureWorkspace(
        nxWorkspaceMother
          .withLib('backend-recipes-core', 'libs/backend/recipes/core')
          .withWorkspaceFile(
            'libs/backend/jest.config.ts',
            'export default {}',
          ),
      );

      const workspace = await scanner.scanWorkspace();

      expect.soft(workspace.info.projects).toEqual(
        expect.arrayContaining([
          {
            name: 'backend-recipes-core',
            path: relativePath('libs/backend/recipes/core'),
          } satisfies Partial<Project>,
          {
            path: relativePath('libs/backend'),
          } satisfies Partial<Project>,
        ]),
      );
      expect.soft(workspace.getProjectFiles('libs/backend')).toMatchObject([
        {
          path: relativePath('libs/backend/jest.config.ts'),
          tags: ['jest-config'],
        },
      ]);
    },
  );
});

function setUp({
  progressReporter = new NullProgressReporter(),
}: { progressReporter?: ProgressReporter } = {}) {
  const commandRunner = new CommandRunnerFake();
  const fileSystem = new FileSystemFake();

  return {
    configureWorkspace: (
      workspaceMother:
        | typeof angularCliWorkspaceMother
        | typeof nxWorkspaceMother,
    ) => {
      commandRunner.configure(workspaceMother.buildCommands());
      fileSystem.configure(workspaceMother.buildFiles());
    },
    scanner: new Scanner({
      commandRunner,
      enricherFactories: [angularCliPack, nxPack, jestPack, corePack].flatMap(
        (pack) => pack.enricherFactories,
      ),
      fileSystem,
      progressReporter,
    }),
  };
}
