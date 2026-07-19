import { basename, dirname } from 'node:path/posix';
import type { ActivityStep } from '../../../../core/models/progress-tracker/activity-step';
import {
  relativePath,
  type RelativePath,
} from '../../../../core/models/relative-path';
import type {
  TransformOptions,
  VerifyOptions,
} from '../../../../core/models/transform';
import {
  defineTransform,
  type Transform,
  type VerifyResult,
} from '../../../../core/models/transform';
import { fileTags } from '../../../core/identifiers';
import { renameJestToSpecFile, renameSpecToJestFile } from '../../jest-core';
import { jestFocusSkipShorthandTransform } from './jest-focus-skip-shorthand/jest-focus-skip-shorthand.transform';
import { jestGlobalsImportTransform } from './jest-globals-import/jest-globals-import.transform';
import { jestMockTransform } from './jest-mock/jest-mock.transform';
import { jestSetMockTransform } from './jest-set-mock/jest-set-mock.transform';
import { jestSetTimeoutTransform } from './jest-set-timeout/jest-set-timeout.transform';
import { jestTypesTransform } from './jest-types/jest-types.transform';
import { jestViTransform } from './jest-vi/jest-vi.transform';
import { renameJestToSpecTransform } from './rename-jest-to-spec/rename-jest-to-spec.transform';
import { snapTransform } from './snap/snap.transform';
import { vitestImportsTransform } from './vitest-imports/vitest-imports.transform';

const JEST_TEST_TRANSFORMS = [
  jestGlobalsImportTransform,
  jestMockTransform,
  jestSetMockTransform,
  jestSetTimeoutTransform,
  jestTypesTransform,
  jestViTransform,
  jestFocusSkipShorthandTransform,
  snapTransform,
  vitestImportsTransform,
  renameJestToSpecTransform,
] as const satisfies readonly Transform[];

export const jestTestTransform = defineTransform({
  name: 'jest-test',
  apply: async (options) => {
    const { progressStep } = options;
    const originalContents = await _captureOriginalContents(options);

    for (const transform of JEST_TEST_TRANSFORMS) {
      await transform.apply({
        ...options,
        progressStep: progressStep.createChildTransform({
          name: transform.name,
        }),
      });
    }

    return {
      verify: (verifyOptions) =>
        _verify({ ...options, ...verifyOptions, originalContents }),
    };
  },
});

async function _captureOriginalContents({
  workspace,
}: TransformOptions): Promise<Map<RelativePath, string>> {
  const testPaths = workspace.files
    .filter((file) => file.tags.includes(fileTags.test))
    .map((file) => file.path);
  const originalContents = new Map<RelativePath, string>();

  for (const testPath of testPaths) {
    const content = await workspace.tree.maybeReadFile(testPath);
    const finalPath = renameJestToSpecFile(testPath) ?? testPath;

    if (content !== null) {
      originalContents.set(finalPath, content);
    }
  }

  return originalContents;
}

async function _verify(
  options: TransformOptions &
    VerifyOptions & {
      originalContents: ReadonlyMap<RelativePath, string>;
    },
): Promise<void | VerifyResult> {
  const { originalContents, workspace } = options;
  if (originalContents.size === 0) {
    return;
  }

  const vitestConfigPaths = workspace.files
    .filter((file) => file.tags.includes(fileTags.vitestConfig))
    .map((file) => file.path);

  if (vitestConfigPaths.length === 0) {
    return;
  }

  const testPaths = Array.from(originalContents.keys());
  const failedTestPaths = new Set<RelativePath>();

  for (const configPath of vitestConfigPaths) {
    const report = await _runVitest(configPath, options);
    for (const failedTestResult of report.testResults
      .filter((result) => result.status === 'failed')
      .flatMap((result) =>
        testPaths.filter((path) => result.name.endsWith(path)),
      )) {
      failedTestPaths.add(failedTestResult);
    }
  }

  if (failedTestPaths.size === 0) {
    return;
  }

  return {
    rollback: ({ activityStep }) =>
      _rollback({
        ...options,
        activityStep,
        failedTestPaths: Array.from(failedTestPaths),
      }),
  };
}

async function _runVitest(
  configPath: RelativePath,
  { activityStep, commandRunner }: TransformOptions & VerifyOptions,
): Promise<VitestJsonReport> {
  const command = [
    'npx',
    'vitest',
    'run',
    '--reporter=json',
    '--config',
    basename(configPath),
  ];
  const cwd = relativePath(dirname(configPath));
  const childStep = activityStep.createChildStep(
    `${command.join(' ')} (cwd: ${cwd})`,
  );

  try {
    const output = await commandRunner.run(command, {
      cwd,
      ignoreExitCode: true,
    });
    const report = JSON.parse(output) as VitestJsonReport;
    childStep.done();
    return report;
  } catch (error) {
    childStep.fail();
    throw error;
  }
}

async function _rollback({
  activityStep,
  failedTestPaths,
  originalContents,
  workspace,
}: Pick<TransformOptions, 'workspace'> & {
  activityStep: ActivityStep;
  failedTestPaths: readonly RelativePath[];
  originalContents: ReadonlyMap<RelativePath, string>;
}): Promise<void> {
  for (const failedTestPath of failedTestPaths) {
    const jestPath = renameSpecToJestFile(failedTestPath);
    const originalContent = originalContents.get(failedTestPath);

    if (jestPath === null || originalContent === undefined) {
      continue;
    }

    await workspace.tree.write(jestPath, originalContent);
    workspace.delete(failedTestPath);
  }

  await workspace.tree.commit();

  activityStep.done(`rolled back ${failedTestPaths.length} file(s)`);
}

export interface VitestJsonReport {
  testResults: Array<{ name: string; status: 'failed' | 'passed' }>;
}
