import { defineFileTransform } from '../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { fileTags } from '../../../core/identifiers';
import { findJestConfig } from '../../jest-ast-utils';

const JEST_CONFIG_TEST_MATCH_VALUE = `["**/.*\\\\.jest\\\\.(cts|tsx)"]`;

export const configTestMatchTransform = defineFileTransform({
  name: 'config-test-match',
  fileTags: [fileTags.jestConfig],
  apply: (content) => {
    const editor = new SgEditor(content);

    const config = findJestConfig(editor.root);

    const testMatchValue = config?.testMatch;

    if (testMatchValue) {
      editor.replaceNode(testMatchValue, JEST_CONFIG_TEST_MATCH_VALUE);
    } else {
      const lastValue = Object.values(config ?? {}).at(-1);

      if (lastValue) {
        editor.replaceNode(
          lastValue,
          `${lastValue.text()},
  testMatch: ${JEST_CONFIG_TEST_MATCH_VALUE}`,
        );
      }
    }

    return editor.commit();
  },
});
