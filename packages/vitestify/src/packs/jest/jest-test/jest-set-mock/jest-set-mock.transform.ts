import { defineFileTransform } from '../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { findingTypes } from '../../identifiers';
import { ensureVitestSymbol } from '../../../../infra/ast/vitest-ast-utils';

export const jestSetMockTransform = defineFileTransform({
  name: 'jest-set-mock',
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
