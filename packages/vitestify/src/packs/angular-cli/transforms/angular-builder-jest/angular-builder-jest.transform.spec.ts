import { describe, expect, it } from 'vitest';
import { Tree } from '../../../../core/domain/tree';
import { Workspace } from '../../../../core/domain/workspace';
import { type RelativePath } from '../../../../core/models/relative-path';
import { WorkspaceMother } from '../../../../core/models/workspace.mother';
import { FileSystemFake } from '../../../../core/ports/file-system.fake';
import { runTransform } from '../../../../testing/run-transform';
import {
  ANGULAR_JSON_PATH,
  type AngularJson,
} from '../../../core/angular-json';
import { angularBuilderJestTransform } from './angular-builder-jest.transform';
import { ExecutedCommand } from '../../../../core/ports/command-runner.fake';

describe('angularBuilderJestTransform', () => {
  it('renames test target to jest when using @angular-builders/jest:run', async () => {
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
  });

  it('creates a new test target that uses @analogjs/vitest-angular:test', async () => {
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

    expect(angularJson?.projects?.['my-app']?.architect?.test).toMatchObject({
      builder: '@analogjs/vitest-angular:test',
    });
  });

  it('installs @analogjs/vitest-angular when a jest builder target is migrated', async () => {
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

    expect(
      commands.find(({ command }) => command.join(' ').startsWith('npm add -D'))
        ?.command,
    ).toEqual(expect.arrayContaining(['@analogjs/vitest-angular']));
  });
});

async function runAngularBuilderJestTransform(
  angularJson?: AngularJson,
): Promise<{
  angularJson: AngularJson | null;
  commands: readonly ExecutedCommand[];
}> {
  const appName = 'my-app';
  const mother = WorkspaceMother.withApp(appName);
  const files: Record<RelativePath, string> = { ...mother.buildFiles() };

  if (angularJson !== undefined) {
    files[ANGULAR_JSON_PATH] = JSON.stringify(angularJson, null, 2);
  }

  const fileSystem = new FileSystemFake();
  fileSystem.configure(files);
  const workspace = new Workspace({
    state: mother.buildWorkspaceState(),
    tree: new Tree({ fileSystem }),
  });

  const { commands } = await runTransform({
    workspace,
    transforms: [angularBuilderJestTransform],
  });

  return {
    angularJson: await workspace.tree.maybeReadJsonFile(ANGULAR_JSON_PATH),
    commands,
  };
}
