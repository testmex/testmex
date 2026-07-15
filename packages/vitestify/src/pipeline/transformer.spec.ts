import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { createTransformResult, defineTransform } from '../core/models/transform';
import { WorkspaceState } from '../core/models/workspace-state';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
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
            return createTransformResult();
          },
        }),
        defineTransform({
          name: 'jest-spy-on',
          apply: async (_workspace, { onProgress } = {}) => {
            onProgress?.('0 file(s) transformed');
            return createTransformResult();
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
            return createTransformResult();
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
    expect.soft(progressReporter.messages()).toEqual([
      '[1/2] jest-mock · transforming',
      '[2/2] jest-spy-on · transforming',
      '[2/2] jest-spy-on · transforming · 1 file(s) transformed',
      '[2/2] jest-spy-on · transformed · 1 file(s) transformed',
    ]);
  });
});
