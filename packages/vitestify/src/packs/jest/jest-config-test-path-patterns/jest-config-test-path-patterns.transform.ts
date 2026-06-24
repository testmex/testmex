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

    const config = editor.root
      .find('module.exports = $CONFIG')
      ?.getMatch('CONFIG');
    const lastPair = config
      ?.children()
      .filter((c) => c.kind() === 'pair')
      .at(-1);

    if (lastPair) {
      editor.replaceNode(
        lastPair,
        `${lastPair.text()},
  testPathPatterns: ["**/.*\\.jest\\.(ts|tsx)"]`,
      );
    }

    return editor.commit();
  },
});
