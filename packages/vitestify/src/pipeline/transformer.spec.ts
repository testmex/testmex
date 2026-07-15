import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { relativePath } from '../core/models/relative-path';
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

  it.todo(
    'non-verifying transform does not flush before the next transform runs',
    async () => {
      const fileSystem = new FileSystemFake();
      let contentReadByB: string | undefined;
      const transformer = new Transformer({
        transforms: [
          defineTransform({
            name: 'transform-a',
            apply: async (workspace) => {
              await workspace.tree.write(relativePath('a.ts'), 'a-migrated');
              return createTransformResult();
            },
          }),
          defineTransform({
            name: 'transform-b',
            apply: async (workspace) => {
              const content = await fileSystem.maybeReadFile(
                relativePath('a.ts'),
              );
              if (content !== null) {
                contentReadByB = content;
              }
              await workspace.tree.write(relativePath('b.ts'), 'b-migrated');
              return createTransformResult();
            },
          }),
        ],
      });
      const workspace = new Workspace({
        state: new WorkspaceState(),
        tree: new Tree({ fileSystem }),
      });

      await transformer.transform(workspace);

      expect(contentReadByB).toBeUndefined();
    },
  );

  it.todo(
    'pipeline continues to the next transform after a non-verifying transform',
    () => {
      // Arrange transform A (no `verify`) that stages a change to file A.
      // Arrange transform B (no `verify`), inlined in the test: its `apply()` sets a variable to `true` and stages a change to file B.
      // Run `Transformer.transform(workspace)`.
      // Assert the variable is `true` — B's `apply()` ran after A, and both files end up on disk with migrated content once the run finishes.
    },
  );

  it.todo(
    "non-verifying transform's change is batched with the next checkpoint, not flushed early",
    () => {
      // Arrange transform A (no `verify`) that stages a change to file A, followed by transform B (`verify`) that stages a change to file B.
      // B's `verify()` reads both file A and file B from the filesystem.
      // Run `Transformer.transform(workspace)`.
      // Assert `verify()` observes both file A and file B already on disk with their migrated content — A's staged change was carried forward and flushed together with B's checkpoint, rather than being flushed separately right after A ran.
    },
  );

  it.todo('transform with verify succeeds when file is on disk', () => {
    // Arrange a fake transform whose `apply()` stages a file change and returns `createTransformResult({ verify })`.
    // `verify()` reads the file from the filesystem and returns `createVerifyResult()` if the expected content is there, otherwise `createVerifyResult({ rollback })`.
    // Run `Transformer.transform(workspace)`.
    // Assert the file is present on the real filesystem with the migrated content (proves commit + flush ran before `verify()`).
    // Assert the file still has the migrated content after the run (no rollback triggered).
  });

  it.todo(
    'transform with verify rolls back by renaming the file on disk',
    () => {
      // Arrange a fake transform whose `apply()` stages a file change and returns `createTransformResult({ verify })`.
      // `verify()` reads the file from the filesystem, determines it failed, and returns `createVerifyResult({ rollback })` where `rollback()` renames the file on disk (e.g. `.spec.ts` → `.jest.ts`) and restores the original content.
      // Run `Transformer.transform(workspace)`.
      // Assert the file no longer exists at its migrated path.
      // Assert the renamed file exists on disk with the original (pre-migration) content.
    },
  );

  it.todo('pipeline continues to the next transform after a rollback', () => {
    // Arrange transform A whose `apply()` stages a file change and returns `createTransformResult({ verify })`; `verify()` fails and returns `createVerifyResult({ rollback })`.
    // Arrange transform B (no `verify`), inlined in the test: its `apply()` sets a variable to `true` and stages a change to file B.
    // Run `Transformer.transform(workspace)`.
    // Assert the variable is `true` — B's `apply()` still ran after A's rollback, and file B ends up on disk with migrated content once the run finishes.
  });
});
