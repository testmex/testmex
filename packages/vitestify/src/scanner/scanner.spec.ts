import { describe, expect, it } from 'vitest';
import { angularJsonMother } from '../core/angular-json.mother';
import { relativePath } from '../core/relative-path';
import type { Project } from '../core/workspace-info';
import { CommandRunnerFake } from '../infra/command-runner.fake';
import { FileSystemFake } from '../infra/file-system.fake';
import { Scanner } from './scanner';

describe(Scanner.name, () => {
  it('detects angular cli project', async () => {
    const { fileSystem, scanner } = setUp();

    fileSystem.configure({
      [relativePath('angular.json')]: angularJsonMother
        .withProject({
          name: 'my-app',
          root: 'apps/my-app',
        })
        .buildString(),
    });

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

    commandRunner.configure({
      ['npx nx show projects --json']: JSON.stringify({
        projects: [
          {
            name: 'my-app',
          },
        ],
      }),
      ['npx nx show project my-app --json']: JSON.stringify({
        name: 'my-app',
        root: 'apps/my-app',
      }),
    });

    fileSystem.configure({
      [relativePath('package.json')]: JSON.stringify({
        dependencies: {
          nx: '23.0.0',
        },
      }),
      [relativePath('nx.json')]: '{}',
      [relativePath('apps/my-app/project.json')]: JSON.stringify({
        name: 'my-app',
      }),
    });

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
