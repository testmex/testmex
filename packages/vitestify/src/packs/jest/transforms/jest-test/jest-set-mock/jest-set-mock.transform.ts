import { defineFileTransform } from '../../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../../../identifiers';
import { isTransformable } from '../../../utils';

export const jestSetMockTransform = defineFileTransform({
  name: 'jest-set-mock',
  fileTags: (tags) => isTransformable(tags),
  findingType: findingTypes.jestSymbol,
  apply: (content) => {
    const editor = new SgEditor(content);
    const nodes = editor.root.findAll('jest.setMock($MODULE, $VALUE)');

    for (const node of nodes) {
      const module = node.getMatch('MODULE');
      const value = node.getMatch('VALUE');
      if (module == null || value == null) {
        continue;
      }

      const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
      editor.replaceNode(
        node,
        `${vi}.mock(${module.text()}, () => (${value.text()}))`,
      );
    }

    return editor.commit();
  },
});
