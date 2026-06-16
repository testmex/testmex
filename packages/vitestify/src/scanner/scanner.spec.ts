import { describe, expect, it } from 'vitest';
import { relativePath } from '../core/relative-path';
import type { Project } from '../core/workspace-info';
import { angularCliWorkspaceMother } from '../infra/angular-cli-workspace-infra.mother';
import { nxWorkspaceMother } from '../infra/nx-workspace-infra.mother';
import { CommandRunnerFake } from '../infra/command-runner.fake';
import { FileSystemFake } from '../infra/file-system.fake';
import { Scanner } from './scanner';

describe(Scanner.name, () => {
  it('detects angular cli project', async () => {
    const { fileSystem, scanner } = setUp();

    fileSystem.configure(
      angularCliWorkspaceMother.withApp('my-app').buildFiles(),
    );

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
    const { commandRunner, fileSystem, scanner } = setUp();

    const workspace = nxWorkspaceMother.withApp('my-app');
    fileSystem.configure(workspace.buildFiles());
    commandRunner.configure(workspace.buildCommands());

    const { projects, workspaceType } = await scanner.scanWorkspace();

    expect.soft(workspaceType).toBe('nx');
    expect.soft(projects).toMatchObject([
      {
        name: 'my-app',
        path: relativePath('apps/my-app'),
      },
    ]);
  });
});

function setUp() {
  const commandRunner = new CommandRunnerFake();
  const fileSystem = new FileSystemFake();

  return {
    commandRunner,
    fileSystem,
    scanner: new Scanner({
      commandRunner,
      fileSystem,
    }),
  };
}
