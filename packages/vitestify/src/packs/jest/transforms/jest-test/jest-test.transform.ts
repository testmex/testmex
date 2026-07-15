import type { WritableWorkspace } from '../../../../core/domain/workspace';
import {
  createTransformResult,
  defineTransform,
  defineTransformGroup,
  type VerifyResult,
} from '../../../../core/models/transform';
import { jestGlobalsImportTransform } from './jest-globals-import/jest-globals-import.transform';
import { jestMockTransform } from './jest-mock/jest-mock.transform';
import { jestSetMockTransform } from './jest-set-mock/jest-set-mock.transform';
import { jestSetTimeoutTransform } from './jest-set-timeout/jest-set-timeout.transform';
import { jestTypesTransform } from './jest-types/jest-types.transform';
import { jestViTransform } from './jest-vi/jest-vi.transform';
import { jestFocusSkipShorthandTransform } from './jest-focus-skip-shorthand/jest-focus-skip-shorthand.transform';
import { snapTransform } from './snap/snap.transform';
import { renameJestToSpecTransform } from './rename-jest-to-spec/rename-jest-to-spec.transform';
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
    await _jestTestGroup.apply(workspace, options);

    return createTransformResult({
      verify: () => _verify(workspace),
    });
  },
});

/**
 * @deprecated 🚧 work in progress
 */
async function _verify(_workspace: WritableWorkspace): Promise<VerifyResult> {
  throw new Error(`🚧 work in progress`);
}
