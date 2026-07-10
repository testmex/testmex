import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { defineTransform } from '../core/models/transform';
import { WorkspaceInfo } from '../core/models/workspace-info';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { ProgressReporterFake } from '../core/ports/progress-reporter.fake';
import { Transformer } from './transformer';

describe(Transformer, () => {
  it.todo('transformer reports transform name during apply', async () => {
    const progressReporter = new ProgressReporterFake();
    const transformer = new Transformer({
      progressReporter,
      transforms: [
        defineTransform({
          name: 'jest-mock',
          apply: async () => {},
        }),
        defineTransform({
          name: 'jest-spy-on',
          apply: async () => {},
        }),
      ],
    });
    const workspace = new Workspace({
      info: new WorkspaceInfo(),
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await transformer.transform(workspace);

    expect(progressReporter.messages()).toEqual([
      'Transforming: jest-mock',
      'Transformed: jest-mock',
      'Transforming: jest-spy-on',
      'Transformed: jest-spy-on',
    ]);
  });
});
