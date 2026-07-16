import { defineFileTransform } from '../../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../../../identifiers';
import { isTransformable } from '../../../jest-core';

export const jestSetTimeoutTransform = defineFileTransform({
  name: 'jest-set-timeout',
  fileTags: (tags) => isTransformable(tags),
  findingType: findingTypes.jestSymbol,
  apply: (content) => {
    const editor = new SgEditor(content);
    const nodes = editor.root.findAll('jest.setTimeout($ARG)');

    for (const node of nodes) {
      const arg = node.getMatch('ARG')?.text() ?? '';
      const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
      editor.replaceNode(node, `${vi}.setConfig({ testTimeout: ${arg} })`);
    }

    return editor.commit();
  },
});
