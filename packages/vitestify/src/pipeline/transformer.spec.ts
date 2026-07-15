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
          apply: async (_workspace, { onProgress } = {}) => {
            onProgress?.('2 file(s) transformed');
          },
        }),
        defineTransform({
          name: 'jest-spy-on',
          apply: async (_workspace, { onProgress } = {}) => {
            onProgress?.('0 file(s) transformed');
          },
        }),
      ],
    });

    await transform();

    expect(progressReporter.messages()).toEqual([
      '[1/2] jest-mock · transforming',
      '[1/2] jest-mock · transforming · 2 file(s) transformed',
      '[1/2] jest-mock · transformed · 2 file(s) transformed',
      '[2/2] jest-spy-on · transforming',
      '[2/2] jest-spy-on · transforming · 0 file(s) transformed',
      '[2/2] jest-spy-on · transformed · 0 file(s) transformed',
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

    expect(progressReporter.errors()).toEqual([
      '[1/1] jest-mock · failed · parse failed',
    ]);
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
          apply: async (_workspace, { onProgress } = {}) => {
            onProgress?.('1 file(s) transformed');
          },
        }),
      ],
    });

    await transform();

    expect
      .soft(progressReporter.errors())
      .toEqual(['[1/2] jest-mock · failed · parse failed']);
    expect
      .soft(progressReporter.messages())
      .toEqual([
        '[1/2] jest-mock · transforming',
        '[2/2] jest-spy-on · transforming',
        '[2/2] jest-spy-on · transforming · 1 file(s) transformed',
        '[2/2] jest-spy-on · transformed · 1 file(s) transformed',
      ]);
  });

  it('non-verifying transform does not flush before the next transform runs', async () => {
    let contentReadByB: string | null = null;
    const { fileSystem, transform } = setUpTransformer({
      transforms: [
        defineTransform({
          name: 'transform-a',
          apply: async (workspace) => {
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
          apply: async (workspace) => {
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
          apply: async (workspace) => {
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
    fileSystem,
    progressReporter,
    transform: () => transformer.transform(workspace),
  };
}
