import { describe, expect, it } from 'vitest';
import { relativePath } from '../models/relative-path';
import { findingType } from '../models/finding';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../models/workspace.mother';
import { fileTag } from './workspace';
import { defineFileTransform } from './define-file-transform';

const JEST_SYMBOL = findingType('jest-symbol');
const fileTags = {
  code: fileTag('code'),
  jestConfig: fileTag('jest-config'),
  jestSetup: fileTag('jest-setup'),
  test: fileTag('test'),
  vitestConfig: fileTag('vitest-config'),
} as const;

describe(defineFileTransform, () => {
  it('transforms files matching fileTags only', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'foo',
          fileName: 'jest.config.ts',
          tags: [fileTags.jestConfig],
        }).build(),
      ),
    );

    const transform = defineFileTransform({
      name: 'tag-only',
      fileTags: [fileTags.jestConfig],
      apply: (content) => content.replace('foo', 'bar'),
    });

    await transform.apply(workspace);

    expect(
      await workspace.tree.maybeReadFile(
        relativePath('apps/my-app/jest.config.ts'),
      ),
    ).toBe('bar');
  });

  it('transforms files matching findingType only', async () => {
    const path = relativePath('apps/my-app/src/app.spec.ts');
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.testFile({
          appName: 'my-app',
          content: 'foo',
          fileName: 'src/app.spec.ts',
        }).build(),
      ),
    );
    workspace.applyHeuristicResults({
      findings: [{ type: JEST_SYMBOL, filePath: path }],
    });

    const transform = defineFileTransform({
      name: 'finding-only',
      findingType: JEST_SYMBOL,
      apply: (content) => content.replace('foo', 'bar'),
    });

    await transform.apply(workspace);

    expect(await workspace.tree.maybeReadFile(path)).toBe('bar');
  });

  it('transforms only files matching both fileTags and findingType', async () => {
    const matchingPath = relativePath('apps/my-app/src/app.spec.ts');
    const setupPath = relativePath('apps/my-app/src/test-setup.ts');
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app')
        .withFile(
          WorkspaceFileMother.testFile({
            appName: 'my-app',
            content: 'foo',
            fileName: 'src/app.spec.ts',
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'foo',
            fileName: 'src/test-setup.ts',
            tags: [fileTags.code, fileTags.jestSetup],
          }).build(),
        ),
    );
    workspace.applyHeuristicResults({
      findings: [
        { type: JEST_SYMBOL, filePath: matchingPath },
        { type: JEST_SYMBOL, filePath: setupPath },
      ],
    });

    const transform = defineFileTransform({
      name: 'both-filters',
      fileTags: (tags) =>
        tags.includes(fileTags.test) && !tags.includes(fileTags.jestSetup),
      findingType: JEST_SYMBOL,
      apply: (content) => content.replace('foo', 'bar'),
    });

    await transform.apply(workspace);

    expect(await workspace.tree.maybeReadFile(matchingPath)).toBe('bar');
    expect(await workspace.tree.maybeReadFile(setupPath)).toBe('foo');
  });

  it('skips files with no readable content', async () => {
    const missingPath = relativePath('apps/my-app/missing.ts');
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app'),
    );
    workspace.tag(missingPath, fileTags.test);

    const transform = defineFileTransform({
      name: 'missing-content',
      fileTags: [fileTags.test],
      apply: (content) => content.replace('foo', 'bar'),
    });

    let progressMessage: string | undefined;
    await transform.apply(workspace, {
      onProgress: (message) => {
        progressMessage = message;
      },
    });

    expect(await workspace.tree.maybeReadFile(missingPath)).toBeNull();
    expect(progressMessage).toBe('0 file(s) transformed');
  });

  it('reports transformed file count via onProgress', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app')
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'foo',
            fileName: 'jest.config.ts',
            tags: [fileTags.jestConfig],
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: 'foo',
            fileName: 'vitest.config.ts',
            tags: [fileTags.vitestConfig],
          }).build(),
        ),
    );

    const transform = defineFileTransform({
      name: 'progress',
      fileTags: [fileTags.jestConfig, fileTags.vitestConfig],
      apply: (content) => content.replace('foo', 'bar'),
    });

    let progressMessage: string | undefined;
    await transform.apply(workspace, {
      onProgress: (message) => {
        progressMessage = message;
      },
    });

    expect(progressMessage).toBe('0 file(s) transformed');
  });

  it('reports one transformed file via onProgress', async () => {
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp('my-app').withFile(
        WorkspaceFileMother.file({
          appName: 'my-app',
          content: 'foo',
          fileName: 'jest.config.ts',
          tags: [fileTags.jestConfig],
        }).build(),
      ),
    );

    const transform = defineFileTransform({
      name: 'progress-one',
      fileTags: [fileTags.jestConfig],
      apply: (content) => content.replace('foo', 'bar'),
    });

    let progressMessage: string | undefined;
    await transform.apply(workspace, {
      onProgress: (message) => {
        progressMessage = message;
      },
    });

    expect(progressMessage).toBe('1 file(s) transformed');
  });
});
