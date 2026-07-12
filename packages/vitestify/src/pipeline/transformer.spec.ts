import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { defineTransform } from '../core/models/transform';
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
      info: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

    expect(progressReporter.messages()).toEqual([
      'Transforming [1/2] jest-mock',
      'Transforming [1/2] jest-mock · 2 file(s) transformed',
      'Transformed  [1/2] jest-mock · 2 file(s) transformed',
      'Transforming [2/2] jest-spy-on',
      'Transforming [2/2] jest-spy-on · 0 file(s) transformed',
      'Transformed  [2/2] jest-spy-on · 0 file(s) transformed',
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
      info: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

    expect(progressReporter.errors()).toEqual([
      'Transform failed [1/1] jest-mock · parse failed',
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
      info: new WorkspaceState(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

    expect.soft(progressReporter.errors()).toEqual([
      'Transform failed [1/2] jest-mock · parse failed',
    ]);
    expect.soft(progressReporter.messages()).toEqual([
      'Transforming [1/2] jest-mock',
      'Transforming [2/2] jest-spy-on',
      'Transforming [2/2] jest-spy-on · 1 file(s) transformed',
      'Transformed  [2/2] jest-spy-on · 1 file(s) transformed',
    ]);
  });
});
