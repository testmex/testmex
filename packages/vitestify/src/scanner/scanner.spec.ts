import { describe, expect, it } from 'vitest';
import { relativePath } from '../core/models/relative-path';
import { projectFileTag, type Project } from '../core/models/workspace-info';
import { angularCliWorkspaceMother } from '../packs/angular-cli/angular-cli-workspace-infra.mother';
import angularCliPack from '../packs/angular-cli';
import corePack from '../packs/core';
import jestPack from '../packs/jest';
import nxPack from '../packs/nx';
import { nxWorkspaceMother } from '../packs/nx/nx-workspace-infra.mother';
import { CommandRunnerFake } from '../core/ports/command-runner.fake';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { Scanner } from './scanner';

describe(Scanner.name, () => {
  it('detects angular cli project', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(angularCliWorkspaceMother.withApp('my-app'));

    const { info } = await scanner.scanWorkspace();

    expect.soft(info.workspaceType).toBe('angular-cli');
    expect.soft(info.projects).toMatchObject([
      {
        name: 'my-app',
        path: relativePath('apps/my-app'),
      } satisfies Partial<Project>,
    ]);
  });

  it('detects nx project', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(nxWorkspaceMother.withApp('my-app'));

    const { info } = await scanner.scanWorkspace();

    expect.soft(info.workspaceType).toBe('nx');
    expect.soft(info.projects).toMatchObject([
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

    const { info } = await scanner.scanWorkspace();

    expect(info.projects).toMatchObject([
      {
        files: [
          {
            path: relativePath('apps/my-app/jest.config.ts'),
            tags: [projectFileTag.jestConfig],
          },
        ],
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

    const { info } = await scanner.scanWorkspace();

    expect(info.projects).toMatchObject([
      {
        files: [
          {
            path: relativePath('apps/my-app/src/app.spec.ts'),
            tags: [projectFileTag.test],
          },
        ],
      },
    ]);
  });
});

function setUp() {
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
    }),
  };
}
