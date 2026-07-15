import type { WritableWorkspace } from '../../../../core/domain/workspace';
import type { RelativePath } from '../../../../core/models/relative-path';
import {
  defineTransform,
  defineTransformGroup,
  type VerifyResult,
} from '../../../../core/models/transform';
import type { CommandRunner } from '../../../../core/ports/command-runner';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { renameSpecToJestFile } from '../rename-spec-to-jest/rename-spec-to-jest.transform';
import { jestGlobalsImportTransform } from './jest-globals-import/jest-globals-import.transform';
import { jestMockTransform } from './jest-mock/jest-mock.transform';
import { jestSetMockTransform } from './jest-set-mock/jest-set-mock.transform';
import { jestSetTimeoutTransform } from './jest-set-timeout/jest-set-timeout.transform';
import { jestTypesTransform } from './jest-types/jest-types.transform';
import { jestViTransform } from './jest-vi/jest-vi.transform';
import { jestFocusSkipShorthandTransform } from './jest-focus-skip-shorthand/jest-focus-skip-shorthand.transform';
import { snapTransform } from './snap/snap.transform';
import {
  renameJestToSpecFile,
  renameJestToSpecTransform,
} from './rename-jest-to-spec/rename-jest-to-spec.transform';
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
  apply: async (workspace, options) => {
    const originalContents = await _captureOriginalContents(workspace);

    await _jestTestGroup.apply(workspace, options);

    return {
      verify: () =>
        _verify({
          commandRunner: options?.commandRunner,
          originalContents,
          workspace,
        }),
    };
  },
});

async function _captureOriginalContents(
  workspace: WritableWorkspace,
): Promise<Map<RelativePath, string>> {
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

async function _verify({
  commandRunner,
  originalContents,
  workspace,
}: {
  commandRunner: CommandRunner | undefined;
  originalContents: ReadonlyMap<RelativePath, string>;
  workspace: WritableWorkspace;
}): Promise<void | VerifyResult> {
  if (commandRunner === undefined || originalContents.size === 0) {
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
    const output = await commandRunner.run([
      'npx',
      'vitest',
      'run',
      '--reporter=json',
      '--config',
      configPath,
    ]);
    const report = JSON.parse(output) as VitestJsonReport;

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

  return {
    rollback: () => _rollback({ failedPaths, originalContents, workspace }),
  };
}

async function _rollback({
  failedPaths,
  originalContents,
  workspace,
}: {
  failedPaths: readonly RelativePath[];
  originalContents: ReadonlyMap<RelativePath, string>;
  workspace: WritableWorkspace;
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
