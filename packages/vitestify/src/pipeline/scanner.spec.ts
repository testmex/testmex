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

    expect.soft(workspace.projects).toMatchObject([
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

    expect.soft(workspace.projects).toMatchObject([
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
        .withAppFile('my-app', 'src/app.spec.ts', 'it("works", () => {})'),
    );

    await scanner.scanWorkspace();

    expect(
      progressReporter.phases()[0].steps.find((step) => step.name === 'test'),
    ).toMatchObject({
      status: 'done',
      message: 'scanned · 1 file(s) found',
    });
  });

  it('scanner calls done once per enricher', async () => {
    const progressReporter = new ProgressReporterFake();
    const { configureWorkspace, scanner } = setUp({ progressReporter });

    configureWorkspace(nxWorkspaceMother.withApp('my-app'));

    await scanner.scanWorkspace();

    expect(
      progressReporter
        .phases()[0]
        .steps.filter((step) => step.message.startsWith('scanned'))
        .map((step) => ({ name: step.name, message: step.message })),
    ).toEqual([
      { name: 'angular-cli', message: 'scanned' },
      { name: 'nx', message: 'scanned · 1 project(s) detected' },
      { name: 'jest', message: 'scanned' },
      { name: 'code', message: 'scanned' },
      { name: 'package-manager', message: 'scanned · pnpm detected (good choice 😉)' },
      { name: 'test', message: 'scanned' },
      { name: 'vitest-config', message: 'scanned' },
    ]);
  });

  it('non-scanning enricher reports contextual status', async () => {
    const progressReporter = new ProgressReporterFake();
    const { configureWorkspace, scanner } = setUp({ progressReporter });

    configureWorkspace(nxWorkspaceMother.withApp('my-app'));

    await scanner.scanWorkspace();

    expect(
      progressReporter.phases()[0].steps.find((step) => step.name === 'nx'),
    ).toMatchObject({
      status: 'done',
      message: 'scanned · 1 project(s) detected',
    });
  });

  it('detects folder with jest.config.ts as project when no nx project exists at that path', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(
      nxWorkspaceMother
        .withLib('backend-recipes-core', 'libs/backend/recipes/core')
        .withWorkspaceFile('libs/backend/jest.config.ts', 'export default {}'),
    );

    const workspace = await scanner.scanWorkspace();

    expect.soft(workspace.projects).toEqual(
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
  });
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
      enrichers: [angularCliPack, nxPack, jestPack, corePack].flatMap(
        (pack) => pack.enrichers,
      ),
      fileSystem,
      progressReporter,
    }),
  };
}
