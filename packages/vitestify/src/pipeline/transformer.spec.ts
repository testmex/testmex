import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { defineTransform } from '../core/models/transform';
import { WorkspaceInfo } from '../core/models/workspace-info';
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
          apply: async () => undefined,
        }),
        defineTransform({
          name: 'jest-spy-on',
          apply: async () => undefined,
        }),
      ],
    });
    const workspace = new Workspace({
      info: new WorkspaceInfo(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

    expect(progressReporter.messages()).toEqual([
      'Transforming [1/2] jest-mock',
      'Transformed  [1/2] jest-mock',
      'Transforming [2/2] jest-spy-on',
      'Transformed  [2/2] jest-spy-on',
    ]);
  });
});
