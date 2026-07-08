import { describe, expect, it } from 'vitest';
import { Tree } from '../../../core/domain/tree';
import { Workspace } from '../../../core/domain/workspace';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { WorkspaceMother } from '../../../core/models/workspace.mother';
import { FileSystemFake } from '../../../core/ports/file-system.fake';
import { runTransform } from '../../../testing/run-transform';
import { angularBuilderJestTransform } from './angular-builder-jest.transform';

describe('angularBuilderJestTransform', () => {
  it.todo(
    'renames test target to jest when using @angular-builders/jest:run',
    async () => {
      const { angularJson } = await runAngularBuilderJestTransform({
        projects: {
          'my-app': {
            root: 'apps/my-app',
            architect: {
              test: {
                builder: '@angular-builders/jest:run',
              },
            },
          },
        },
      });

      expect.soft(angularJson).toMatchObject({
        projects: {
          'my-app': {
            architect: {
              jest: {
                builder: '@angular-builders/jest:run',
              },
            },
          },
        },
      });
    },
  );

  it.todo(
    'creates a new test target that uses @analogjs/vitest-angular:test',
    async () => {
      const { angularJson } = await runAngularBuilderJestTransform({
        projects: {
          'my-app': {
            root: 'apps/my-app',
            architect: {
              test: {
                builder: '@angular-builders/jest:run',
              },
            },
          },
        },
      });

      expect(
        (angularJson as AngularJson).projects?.['my-app']?.architect?.test,
      ).toMatchObject({
        builder: '@analogjs/vitest-angular:test',
      });
    },
  );

  it.todo(
    'installs @analogjs/vitest-angular when a jest builder target is migrated',
    async () => {
      const { commands } = await runAngularBuilderJestTransform({
        projects: {
          'my-app': {
            root: 'apps/my-app',
            architect: {
              test: {
                builder: '@angular-builders/jest:run',
              },
            },
          },
        },
      });

      expect(commands).toContainEqual([
        'npm',
        'add',
        '-D',
        '@analogjs/vitest-angular',
      ]);
    },
  );
});

async function runAngularBuilderJestTransform(
  angularJson?: Record<string, unknown>,
): Promise<{
  angularJson: Record<string, unknown> | null;
  commands: readonly (readonly string[])[];
}> {
  const appName = 'my-app';
  const mother = WorkspaceMother.withApp(appName);
  const files: Record<RelativePath, string> = { ...mother.buildFiles() };

  if (angularJson !== undefined) {
    files[relativePath('angular.json')] = JSON.stringify(angularJson, null, 2);
  }

  const fileSystem = new FileSystemFake();
  fileSystem.configure(files);
  const workspace = new Workspace({
    info: mother.buildWorkspaceInfo(),
    tree: new Tree({ fileSystem }),
  });

  await runTransform({ workspace, transforms: [angularBuilderJestTransform] });

  return {
    angularJson: await workspace.tree.maybeReadJsonFile(
      relativePath('angular.json'),
    ),
    commands: workspace.commands.all(),
  };
}

interface AngularJson {
  projects?: Record<
    string,
    {
      architect?: Record<string, { builder: string; options?: unknown }>;
    }
  >;
}
