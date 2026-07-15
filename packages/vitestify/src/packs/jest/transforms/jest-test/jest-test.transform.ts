import type { WritableWorkspace } from '../../../../core/domain/workspace';
import type { RelativePath } from '../../../../core/models/relative-path';
import {
  createTransformResult,
  createVerifyResult,
  defineTransform,
  defineTransformGroup,
  type VerifyResult,
} from '../../../../core/models/transform';
import type { CommandRunner } from '../../../../core/ports/command-runner';
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

    return createTransformResult({
      verify: () =>
        _verify({
          commandRunner: options?.commandRunner,
          originalContents,
          workspace,
        }),
    });
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
}): Promise<VerifyResult> {
  if (commandRunner === undefined || originalContents.size === 0) {
    return createVerifyResult();
  }

  const paths = Array.from(originalContents.keys());
  const output = await commandRunner.run([
    'npx',
    'vitest',
    'run',
    '--reporter=json',
    ...paths,
  ]);
  const report = JSON.parse(output) as VitestJsonReport;
  const failedPaths = paths.filter((path) =>
    report.testResults.some(
      (result) => result.status === 'failed' && result.name.endsWith(path),
    ),
  );

  if (failedPaths.length === 0) {
    return createVerifyResult();
  }

  return createVerifyResult({
    rollback: () => _rollback({ failedPaths, originalContents, workspace }),
  });
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

    await workspace.rename(specPath, jestPath);
    await workspace.tree.write(jestPath, originalContent);
  }

  await workspace.tree.commit();
}

interface VitestJsonReport {
  testResults: Array<{ name: string; status: string }>;
}
