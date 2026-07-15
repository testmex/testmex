import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { CommandRunnerFake } from '../../../../core/ports/command-runner.fake';
import { Analyzer } from '../../../../pipeline/analyzer';
import { dummyOnProgress } from '../../../../testing/dummy-on-progress';
import { runTransform } from '../../../../testing/run-transform';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import jestPack from '../../index';
import { jestTestTransform, VitestJsonReport } from './jest-test.transform';

describe('jest-test', () => {
  it('does not transform a test file tagged as jest setup', async () => {
    const content = `\
import { jest } from '@jest/globals';
jest.mock('./foo');
`;

    expect(await _transformSetupTestFile(content)).toBe(`\
import { jest } from '@jest/globals';
jest.mock('./foo');
`);
  });

  it('verify returns VerifyResult with rollback on failure', async () => {
    const { commandRunner, workspace } = await _setupVerifyWorkspace();

    const result = await jestTestTransform.apply({
      workspace,
      commandRunner,
      onProgress: dummyOnProgress,
    });
    const verifyResult = await result?.verify();

    expect(verifyResult?.rollback).toBeDefined();
  });

  it('rollback reverts only failed files', async () => {
    const { commandRunner, workspace } = await _setupVerifyWorkspace();

    const result = await jestTestTransform.apply({
      workspace,
      commandRunner,
      onProgress: dummyOnProgress,
    });

    const verifyResult = await result?.verify();
    await verifyResult?.rollback();

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/failing.spec.ts'),
        ),
      )
      .toBeNull();

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/failing.jest.cts'),
        ),
      )
      .toBe('expect(jest.fn()).toHaveBeenCalledWith(42);');

    expect
      .soft(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/src/passing.spec.ts'),
        ),
      )
      .toContain(`expect(vi.fn()).not.toHaveBeenCalled();`);
  });
});

async function _setupVerifyWorkspace() {
  const appName = 'my-app';
  const commandRunner = new CommandRunnerFake();
  const failingJestPath = relativePath(`apps/${appName}/src/failing.jest.cts`);
  const passingJestPath = relativePath(`apps/${appName}/src/passing.jest.cts`);
  const failingSpecPath = relativePath(`apps/${appName}/src/failing.spec.ts`);
  const passingSpecPath = relativePath(`apps/${appName}/src/passing.spec.ts`);

  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName)
      .withFile(
        WorkspaceFileMother.file({
          appName,
          content: 'export default {}',
          fileName: 'vitest.config.mts',
          tags: [fileTags.vitestConfig],
        }).build(),
      )
      .withFile(
        WorkspaceFileMother.testFile({
          appName,
          content: `expect(jest.fn()).toHaveBeenCalledWith(42);`,
          fileName: 'src/failing.jest.cts',
        }).build(),
      )
      .withFile(
        WorkspaceFileMother.testFile({
          appName,
          content: 'expect(jest.fn()).not.toHaveBeenCalled();',
          fileName: 'src/passing.jest.cts',
        }).build(),
      ),
  );

  await new Analyzer({ heuristics: jestPack.heuristics }).analyze(workspace);

  workspace.applyHeuristicResults({
    findings: [
      { type: findingTypes.jestSymbol, filePath: failingJestPath },
      { type: findingTypes.jestSymbol, filePath: passingJestPath },
    ],
  });

  commandRunner.configure([
    {
      command: [
        'npx',
        'vitest',
        'run',
        '--reporter=json',
        '--config',
        'vitest.config.mts',
      ],
      cwd: relativePath('apps/my-app'),
      output: JSON.stringify({
        testResults: [
          { name: `/my-workspace/${failingSpecPath}`, status: 'failed' },
          { name: `/my-workspace/${passingSpecPath}`, status: 'passed' },
        ],
      } satisfies VitestJsonReport),
    },
  ]);

  return {
    commandRunner,
    failingJestPath,
    failingSpecPath,
    passingSpecPath,
    workspace,
  };
}

async function _transformSetupTestFile(content: string) {
  const appName = 'my-app';
  const filePath = 'src/test-setup.ts';

  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.file({
        appName,
        content,
        fileName: filePath,
        tags: [fileTags.code, fileTags.jestSetup],
      }).build(),
    ),
  );

  await runTransform({
    workspace,
    heuristics: jestPack.heuristics,
    transforms: [jestTestTransform],
  });

  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/${filePath}`),
  );
}
