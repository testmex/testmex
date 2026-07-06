import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../../core/identifiers';
import { findJestConfig } from '../jest-ast-utils';

export const configTestMatchTransform = defineFileTransform({
  name: 'config-test-match',
  fileTags: [fileTags.jestConfig],
  apply: (content) => {
    const editor = new SgEditor(content);

    const config = findJestConfig(editor.root);

    const testMatchPair = config?.testMatch;

    if (testMatchPair) {
      editor.replaceNode(
        testMatchPair,
        `testMatch: ["**/.*\\\\.jest\\\\.(cts|tsx)"]`,
      );
    } else {
      const lastPair = Object.values(config ?? {}).at(-1);

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
