import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { relativePath } from '../core/models/relative-path';
import { defineTransform } from '../core/models/transform';
import type { Transform } from '../core/models/transform';
import { WorkspaceState } from '../core/models/workspace-state';
import type { CommandRunner } from '../core/ports/command-runner';
import { CommandRunnerFake } from '../core/ports/command-runner.fake';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
import { Transformer } from './transformer';

describe(Transformer, () => {
  it('transformer reports transform name during apply', async () => {
    const { progressReporter, transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'jest-mock',
          apply: async ({ progressStep }) => {
            progressStep.updateMessage('2 file(s) transformed');
          },
        }),
        defineTransform({
          name: 'jest-spy-on',
          apply: async ({ progressStep }) => {
            progressStep.updateMessage('0 file(s) transformed');
          },
        }),
      ],
    });

    await transform();

    expect(progressReporter.phases()[0].steps).toMatchObject([
      {
        name: 'jest-mock',
        stepNumber: 1,
        stepCount: 2,
        status: 'done',
        message: 'transformed · 2 file(s) transformed',
      },
      {
        name: 'jest-spy-on',
        stepNumber: 2,
        stepCount: 2,
        status: 'done',
        message: 'transformed · 0 file(s) transformed',
      },
      {
        name: 'Applying changes',
        status: 'done',
        message: 'done',
        subSteps: [{ message: 'applied 0 changes' }],
      },
    ]);
  });

  it('transformer reports transform error on progress', async () => {
    const { progressReporter, transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'jest-mock',
          apply: async () => {
            throw new Error('parse failed');
          },
        }),
      ],
    });

    await transform();

    expect(progressReporter.phases()[0].steps[0]).toMatchObject({
      status: 'error',
      error: 'failed · parse failed',
    });
  });

  it('transformer continues to next transform after error', async () => {
    const { progressReporter, transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'jest-mock',
          apply: async () => {
            throw new Error('parse failed');
          },
        }),
        defineTransform({
          name: 'jest-spy-on',
          apply: async ({ progressStep }) => {
            progressStep.updateMessage('1 file(s) transformed');
          },
        }),
      ],
    });

    await transform();

    expect
      .soft(progressReporter.phases()[0].steps[0])
      .toMatchObject({ status: 'error', error: 'failed · parse failed' });
    expect.soft(progressReporter.phases()[0].steps[1]).toMatchObject({
      name: 'jest-spy-on',
      stepNumber: 2,
      stepCount: 2,
      status: 'done',
      message: 'transformed · 1 file(s) transformed',
    });
  });

  it('non-verifying transform does not flush before the next transform runs', async () => {
    let contentReadByB: string | null = null;
    const { fileSystem, transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'transform-a',
          apply: async ({ workspace }) => {
            await workspace.tree.write(
              relativePath('a.spec.ts'),
              'expect(1).toBe(1)',
            );
          },
        }),
        defineTransform({
          name: 'transform-b',
          apply: async () => {
            contentReadByB = await fileSystem.maybeReadFile(
              relativePath('a.spec.ts'),
            );
          },
        }),
      ],
    });

    await transform();

    expect(contentReadByB).toBeNull();
  });

  it("non-verifying transform's change is batched with the next checkpoint, not flushed early", async () => {
    let contentAAtVerify: string | null = null;
    const { fileSystem, transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'transform-a',
          apply: async ({ workspace }) => {
            await workspace.tree.write(
              relativePath('a.spec.ts'),
              'expect(1).toBe(1)',
            );
          },
        }),
        defineTransform({
          name: 'transform-b',
          apply: async () => {
            return {
              verify: async () => {
                contentAAtVerify = await fileSystem.maybeReadFile(
                  relativePath('a.spec.ts'),
                );
              },
            };
          },
        }),
      ],
    });

    await transform();

    expect(contentAAtVerify).toBe('expect(1).toBe(1)');
  });

  it('transform with verify rolls back', async () => {
    const { fileSystem, transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'transform-a',
          apply: async ({ workspace }) => {
            await workspace.tree.write(
              relativePath('a.spec.ts'),
              'expect(2).toBe(2)',
            );

            return {
              verify: async () => ({
                rollback: async () => {
                  await workspace.tree.write(
                    relativePath('a.spec.ts'),
                    'expect(1).toBe(1)',
                  );
                },
              }),
            };
          },
        }),
      ],
    });

    fileSystem.configure({
      [relativePath('a.spec.ts')]: 'expect(1).toBe(1)',
    });

    await transform();

    expect(await fileSystem.maybeReadFile(relativePath('a.spec.ts'))).toBe(
      'expect(1).toBe(1)',
    );
  });

  it('pipeline continues to the next transform after a rollback', async () => {
    let bApplied = false;
    const { transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'transform-a',
          apply: async () => {
            return {
              verify: async () => ({
                rollback: async () => undefined,
              }),
            };
          },
        }),
        defineTransform({
          name: 'transform-b',
          apply: async () => {
            bApplied = true;
          },
        }),
      ],
    });

    await transform();

    expect(bApplied).toBe(true);
  });

  it('drains queued commands', async () => {
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure([
      { command: ['npm', 'install', 'vitest'], output: '' },
      { command: ['npx', 'nx', 'add', '@nx/vitest'], output: '' },
    ]);
    const { transform, workspace } = setUpTransformer({
      commandRunner,
      transforms: [
        defineTransform({
          name: 'install-deps',
          apply: async ({ workspace }) => {
            workspace.commands.add(['npm', 'install', 'vitest']);
            workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);
          },
        }),
      ],
    });

    await transform();

    expect
      .soft(commandRunner.executedCommands())
      .toMatchObject([
        { command: ['npm', 'install', 'vitest'] },
        { command: ['npx', 'nx', 'add', '@nx/vitest'] },
      ]);
    expect.soft(workspace.commands.all()).toEqual([]);
  });

  it('continues after command failure', async () => {
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure([
      {
        command: ['npm', 'install', 'vitest'],
        error: new Error('install failed'),
      },
      { command: ['npx', 'nx', 'add', '@nx/vitest'], output: '' },
    ]);
    const { transform } = setUpTransformer({
      commandRunner,
      transforms: [
        defineTransform({
          name: 'install-deps',
          apply: async ({ workspace }) => {
            workspace.commands.add(['npm', 'install', 'vitest']);
            workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);
          },
        }),
      ],
    });

    await transform();

    expect(commandRunner.executedCommands()).toMatchObject([
      { command: ['npm', 'install', 'vitest'] },
      { command: ['npx', 'nx', 'add', '@nx/vitest'] },
    ]);
  });

  it('reports queued commands as substeps during final flush', async () => {
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure([
      { command: ['npm', 'install', 'vitest'], output: '' },
      { command: ['npx', 'nx', 'add', '@nx/vitest'], output: '' },
    ]);
    const { progressReporter, transform } = setUpTransformer({
      commandRunner,
      transforms: [
        defineTransform({
          name: 'install-deps',
          apply: async ({ workspace }) => {
            workspace.commands.add(['npm', 'install', 'vitest']);
            workspace.commands.add(['npx', 'nx', 'add', '@nx/vitest']);
          },
        }),
      ],
    });

    await transform();

    expect(progressReporter.phases()[0].steps).toMatchObject([
      {
        name: 'install-deps',
        status: 'done',
      },
      {
        name: 'Applying changes',
        status: 'done',
        subSteps: [
          { message: 'applied 0 changes' },
          { message: 'npm install vitest · succeeded' },
          { message: 'npx nx add @nx/vitest · succeeded' },
        ],
      },
    ]);
  });

  it('reports command failure as a substep during final flush', async () => {
    const commandRunner = new CommandRunnerFake();
    commandRunner.configure([
      {
        command: ['npm', 'install', 'vitest'],
        error: new Error('install failed'),
      },
    ]);
    const { progressReporter, transform } = setUpTransformer({
      commandRunner,
      transforms: [
        defineTransform({
          name: 'install-deps',
          apply: async ({ workspace }) => {
            workspace.commands.add(['npm', 'install', 'vitest']);
          },
        }),
      ],
    });

    await transform();

    expect(progressReporter.phases()[0].steps[1]).toMatchObject({
      name: 'Applying changes',
      subSteps: [
        { message: 'applied 0 changes' },
        { message: 'npm install vitest · failed · install failed' },
      ],
    });
  });
});

function setUpTransformer({
  commandRunner = new CommandRunnerFake(),
  transforms,
}: {
  commandRunner?: CommandRunner;
  transforms: Transform[];
}) {
  const fileSystem = new FileSystemFake();
  const progressReporter = new ProgressReporterFake();
  const workspace = new Workspace({
    state: new WorkspaceState(),
    tree: new Tree({ fileSystem }),
  });
  const transformer = new Transformer({
    commandRunner,
    progressReporter,
    transforms,
  });

  return {
    commandRunner,
    fileSystem,
    progressReporter,
    transform: () => transformer.transform(workspace),
    workspace,
  };
}
