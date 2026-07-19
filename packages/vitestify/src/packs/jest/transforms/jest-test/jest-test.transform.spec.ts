import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { CommandRunnerFake } from '../../../../core/ports/command-runner.fake';
import { Analyzer } from '../../../../pipeline/analyzer';
import { Transformer } from '../../../../pipeline/transformer';
import { ProgressTracker } from '../../../../core/models/progress-tracker';
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
      progressStep: _createJestTestTransformStep(),
    });
    const verifyResult = await result?.verify({
      activityStep: _createActivityStep('Verifying'),
    });

    expect(verifyResult?.rollback).toBeDefined();
  });

  it('rollback reverts only failed files', async () => {
    const { commandRunner, workspace } = await _setupVerifyWorkspace();

    const result = await jestTestTransform.apply({
      workspace,
      commandRunner,
      progressStep: _createJestTestTransformStep(),
    });

    const verifyResult = await result?.verify({
      activityStep: _createActivityStep('Verifying'),
    });
    await verifyResult?.rollback({
      activityStep: _createActivityStep('Rolling back'),
    });

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

  it.todo('records child transform steps with per-child file counts', async () => {
    const progressTracker = new ProgressTracker();
    const appName = 'my-app';
    const testPath = relativePath(`apps/${appName}/src/example.jest.ts`);

    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp(appName).withFile(
        WorkspaceFileMother.testFile({
          appName,
          content: 'expect(jest.fn()).toHaveBeenCalled();',
          fileName: 'src/example.jest.ts',
        }).build(),
      ),
    );

    await new Analyzer({ heuristics: jestPack.heuristics }).analyze(workspace);
    workspace.applyHeuristicResults({
      findings: [{ type: findingTypes.jestSymbol, filePath: testPath }],
    });

    await new Transformer({
      commandRunner: new CommandRunnerFake(),
      transforms: [jestTestTransform],
      progressTracker,
    }).transform(workspace);

    const jestTestStep = progressTracker
      .snapshot()
      .phases.find((phase) => phase.kind === 'transforming')
      ?.steps.find(
        (step) => step.kind === 'transform' && step.name === 'jest-test',
      );

    expect(jestTestStep).toMatchObject({
      kind: 'transform',
      name: 'jest-test',
      childTransforms: [
        { name: 'jest-globals-import', transformedFileCount: 0 },
        { name: 'jest-mock', transformedFileCount: 0 },
        { name: 'jest-set-mock', transformedFileCount: 0 },
        { name: 'jest-set-timeout', transformedFileCount: 0 },
        { name: 'jest-types', transformedFileCount: 0 },
        { name: 'jest-vi', transformedFileCount: 1 },
        { name: 'jest-focus-skip-shorthand', transformedFileCount: 0 },
        { name: 'snap', transformedFileCount: 0 },
        { name: 'vitest-imports', transformedFileCount: 1 },
        { name: 'rename-jest-to-spec', transformedFileCount: 0 },
      ],
    });
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

function _createJestTestTransformStep() {
  return new ProgressTracker()
    .beginTransforming({ transformCount: 1 })
    .createTransformStep({ name: 'jest-test' });
}

function _createActivityStep(message: string) {
  return new ProgressTracker()
    .beginTransforming({ transformCount: 1 })
    .createActivityStep(message);
}
