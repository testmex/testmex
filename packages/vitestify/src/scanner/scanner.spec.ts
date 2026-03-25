import { describe, expect, it } from 'vitest';
import { angularJsonMother } from '../core/angular-json.mother';
import { relativePath } from '../core/relative-path';
import type { Project } from '../core/workspace-info';
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

  it.todo('detects nx project', () => {
    // Arrange: create a temp workspace with `nx.json`, `project.json`, and a `jest.config.ts`.
    // Act: run scanner on the workspace path.
    // Assert: returns project type `nx` with the jest config path.
  });
});

function setUp() {
  const fileSystem = new FileSystemFake();

  return {
    fileSystem,
    scanner: new Scanner(fileSystem),
  };
}
