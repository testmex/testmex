import { basename, dirname } from 'node:path/posix';
import {
  relativePath,
  type RelativePath,
} from '../../../../core/models/relative-path';
import type { TransformOptions } from '../../../../core/models/transform';
import {
  defineTransform,
  defineTransformGroup,
  type VerifyResult,
} from '../../../../core/models/transform';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { renameSpecToJestFile } from '../../../core/transforms/rename-spec-to-jest/rename-spec-to-jest.transform';
import { jestFocusSkipShorthandTransform } from './jest-focus-skip-shorthand/jest-focus-skip-shorthand.transform';
import { jestGlobalsImportTransform } from './jest-globals-import/jest-globals-import.transform';
import { jestMockTransform } from './jest-mock/jest-mock.transform';
import { jestSetMockTransform } from './jest-set-mock/jest-set-mock.transform';
import { jestSetTimeoutTransform } from './jest-set-timeout/jest-set-timeout.transform';
import { jestTypesTransform } from './jest-types/jest-types.transform';
import { jestViTransform } from './jest-vi/jest-vi.transform';
import {
  renameJestToSpecFile,
  renameJestToSpecTransform,
} from './rename-jest-to-spec/rename-jest-to-spec.transform';
import { snapTransform } from './snap/snap.transform';
import { vitestImportsTransform } from './vitest-imports/vitest-imports.transform';

const _jestTestGroup = defineTransformGroup('jest-test', [
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
]);

export const jestTestTransform = defineTransform({
  name: 'jest-test',
  apply: async (options) => {
    const originalContents = await _captureOriginalContents(options);

    await _jestTestGroup.apply(options);

    return {
      verify: () => _verify({ ...options, originalContents }),
    };
  },
});

async function _captureOriginalContents({
  workspace,
}: TransformOptions): Promise<Map<RelativePath, string>> {
  const jestTestPaths = workspace.files
    .filter((file) => file.findings.includes(findingTypes.jestSymbol))
    .map((file) => file.path);
  const originalContents = new Map<RelativePath, string>();

  for (const jestPath of jestTestPaths) {
    const content = await workspace.tree.maybeReadFile(jestPath);
    const finalPath = renameJestToSpecFile(jestPath) ?? jestPath;

    if (content !== null) {
      originalContents.set(finalPath, content);
    }
  }

  return originalContents;
}

async function _verify(
  options: TransformOptions & {
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

  const migratedPaths = Array.from(originalContents.keys());
  const failedPaths: RelativePath[] = [];

  for (const configPath of vitestConfigPaths) {
    const report = await _runVitest(configPath, options);

    for (const path of migratedPaths) {
      if (
        failedPaths.includes(path) ||
        !report.testResults.some(
          (result) => result.status === 'failed' && result.name.endsWith(path),
        )
      ) {
        continue;
      }

      failedPaths.push(path);
    }
  }

  if (failedPaths.length === 0) {
    return;
  }

  return { rollback: () => _rollback({ ...options, failedPaths }) };
}

async function _runVitest(
  configPath: RelativePath,
  { commandRunner }: TransformOptions,
): Promise<VitestJsonReport> {
  const output = await commandRunner.run(
    [
      'npx',
      'vitest',
      'run',
      '--reporter=json',
      '--config',
      basename(configPath),
    ],
    {
      cwd: relativePath(dirname(configPath)),
      ignoreExitCode: true,
    },
  );
  return JSON.parse(output);
}

async function _rollback({
  failedPaths,
  originalContents,
  workspace,
}: TransformOptions & {
  failedPaths: readonly RelativePath[];
  originalContents: ReadonlyMap<RelativePath, string>;
}): Promise<void> {
  for (const specPath of failedPaths) {
    const jestPath = renameSpecToJestFile(specPath);
    const originalContent = originalContents.get(specPath);

    if (jestPath === null || originalContent === undefined) {
      continue;
    }

    await workspace.tree.write(jestPath, originalContent);
    workspace.delete(specPath);
  }

  await workspace.tree.commit();
}

export interface VitestJsonReport {
  testResults: Array<{ name: string; status: string }>;
}
