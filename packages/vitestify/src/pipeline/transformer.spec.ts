import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { relativePath } from '../core/models/relative-path';
import { defineTransform } from '../core/models/transform';
import { WorkspaceState } from '../core/models/workspace-state';
import { CommandRunnerFake } from '../core/ports/command-runner.fake';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
import { CommandFlusher } from './command-flusher';
import { Transformer } from './transformer';

describe(Transformer, () => {
  it('transformer reports transform name during apply', async () => {
    const progressReporter = new ProgressReporterFake();
    const transformer = new Transformer({
      progressReporter,
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
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

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
    const progressReporter = new ProgressReporterFake();
    const transformer = new Transformer({
      progressReporter,
      transforms: [
        defineTransform({
          name: 'jest-mock',
          apply: async () => {
            throw new Error('parse failed');
          },
        }),
      ],
    });
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

    expect(progressReporter.errors()).toEqual([
      '[1/1] jest-mock · failed · parse failed',
    ]);
  });

  it('transformer continues to next transform after error', async () => {
    const progressReporter = new ProgressReporterFake();
    const transformer = new Transformer({
      progressReporter,
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
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

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
    const fileSystem = new FileSystemFake();
    let contentReadByB: string | null = null;
    const transformer = new Transformer({
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
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem }),
    });

    await transformer.transform(workspace);

    expect(contentReadByB).toBeNull();
  });

  it("non-verifying transform's change is batched with the next checkpoint, not flushed early", async () => {
    const fileSystem = new FileSystemFake();
    const commandFlusher = new CommandFlusher({
      commandRunner: new CommandRunnerFake(),
    });
    let contentAAtVerify: string | null = null;
    const transformer = new Transformer({
      commandFlusher,
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
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem }),
    });

    await transformer.transform(workspace);

    expect(contentAAtVerify).toBe('expect(1).toBe(1)');
  });

  it('transform with verify rolls back', async () => {
    const fileSystem = new FileSystemFake();

    fileSystem.configure({
      [relativePath('a.spec.ts')]: 'expect(1).toBe(1)',
    });

    const commandFlusher = new CommandFlusher({
      commandRunner: new CommandRunnerFake(),
    });

    const transformer = new Transformer({
      commandFlusher,
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
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem }),
    });

    await transformer.transform(workspace);

    expect(await fileSystem.maybeReadFile(relativePath('a.spec.ts'))).toBe(
      'expect(1).toBe(1)',
    );
  });

  it('pipeline continues to the next transform after a rollback', async () => {
    const fileSystem = new FileSystemFake();
    const commandFlusher = new CommandFlusher({
      commandRunner: new CommandRunnerFake(),
    });
    let bApplied = false;
    const transformer = new Transformer({
      commandFlusher,
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
    const workspace = new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem }),
    });

    await transformer.transform(workspace);

    expect(bApplied).toBe(true);
  });
});
