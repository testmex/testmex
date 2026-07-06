import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../../core/identifiers';

export const configTestMatchTransform = defineFileTransform({
  name: 'config-test-match',
  fileTags: [fileTags.jestConfig],
  /**
   * @deprecated 🚧 work in progress
   */
  apply: (content) => {
    const editor = new SgEditor(content);

    const configPairs = editor.root
      .find('module.exports = $CONFIG')
      ?.getMatch('CONFIG')
      ?.children()
      ?.filter((c) => c.kind() === 'pair');

    const testMatchPair = configPairs?.find(
      (pair) => pair.child(0)?.text() === 'testMatch',
    );

    if (!testMatchPair) {
      const lastPair = configPairs?.at(-1);

      if (lastPair) {
        editor.replaceNode(
          lastPair,
          `${lastPair.text()},
  testMatch: ["**/.*\\\\.jest\\\\.(cts|tsx)"]`,
        );
      }
    }

    return editor.commit();
  },
});
