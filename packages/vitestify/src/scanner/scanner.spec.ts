import { describe, expect, it } from 'vitest';
import { relativePath } from '../core/relative-path';
import { projectFileTag, type Project } from '../core/workspace-info';
import { angularCliWorkspaceMother } from '../packs/angular-cli/angular-cli-workspace-infra.mother';
import { nxWorkspaceMother } from '../packs/nx/nx-workspace-infra.mother';
import { CommandRunnerFake } from '../infra/command-runner.fake';
import { FileSystemFake } from '../infra/file-system.fake';
import { Scanner } from './scanner';

describe(Scanner.name, () => {
  it('detects angular cli project', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(angularCliWorkspaceMother.withApp('my-app'));

    const { projects, workspaceType } = await scanner.scanWorkspace();

    expect.soft(workspaceType).toBe('angular-cli');
    expect.soft(projects).toMatchObject([
      {
        name: 'my-app',
        path: relativePath('apps/my-app'),
      } satisfies Partial<Project>,
    ]);
  });

  it('detects nx project', async () => {
    const { configureWorkspace, scanner } = setUp();

    configureWorkspace(nxWorkspaceMother.withApp('my-app'));

    const { projects, workspaceType } = await scanner.scanWorkspace();

    expect.soft(workspaceType).toBe('nx');
    expect.soft(projects).toMatchObject([
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

    const { projects } = await scanner.scanWorkspace();

    expect(projects).toMatchObject([
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

    const { projects } = await scanner.scanWorkspace();

    expect(projects).toMatchObject([
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
      fileSystem,
    }),
  };
}
