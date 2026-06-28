import { describe, expect, it } from 'vitest';
import { relativePath } from '../core/models/relative-path';
import { type Project } from '../core/models/workspace-info';
import { CommandRunnerFake } from '../core/ports/command-runner.fake';
import { FileSystemFake } from '../core/ports/file-system.fake';
import angularCliPack from '../packs/angular-cli';
import { angularCliWorkspaceMother } from '../packs/angular-cli/angular-cli-workspace-infra.mother';
import corePack from '../packs/core';
import jestPack from '../packs/jest';
import nxPack from '../packs/nx';
import { nxWorkspaceMother } from '../packs/nx/nx-workspace-infra.mother';
import { Scanner } from './scanner';

describe(Scanner.name, () => {
  it('detects angular cli project', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(angularCliWorkspaceMother.withApp('my-app'));

    const { info } = await scanner.scanWorkspace();

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

    expect(info.getProjectFiles('my-app')).toMatchObject([
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

    const { info } = await scanner.scanWorkspace();

    expect(info.getProjectFiles('my-app')).toMatchObject([
      {
        path: relativePath('apps/my-app/src/app.spec.ts'),
        tags: ['test'],
      },
    ]);
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

      const { info } = await scanner.scanWorkspace();

      expect.soft(info.projects).toEqual(
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
      expect.soft(info.getProjectFiles('libs/backend')).toMatchObject([
        {
          path: relativePath('libs/backend/jest.config.ts'),
          tags: ['jest-config'],
        },
      ]);
    },
  );
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
