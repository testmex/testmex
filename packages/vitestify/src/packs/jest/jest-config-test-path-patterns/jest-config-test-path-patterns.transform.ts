import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';

/**
 * @deprecated 🚧 Work in progress.
 */
export const jestConfigTestPathPatterns = defineFileTransform({
  findingType: findingTypes.jestConfig,
  apply: (content) => {
    const editor = new SgEditor(content);

    const config = editor.root.find('module.exports = {$CONFIG}'); // ?

    return editor.commit();
  },
});
