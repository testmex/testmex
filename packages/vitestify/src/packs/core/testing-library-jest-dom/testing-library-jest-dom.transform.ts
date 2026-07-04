import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { findingTypes } from '../identifiers';

export const testingLibraryJestDomTransform = defineFileTransform({
  name: 'testing-library-jest-dom',
  findingType: findingTypes.testingLibraryJestDom,
  apply: _rewriteTestingLibraryJestDomImport,
});

/**
 * @deprecated 🚧 work in progress
 */
function _rewriteTestingLibraryJestDomImport(_content: string): string {
  throw new Error(`🚧 work in progress`);
}
