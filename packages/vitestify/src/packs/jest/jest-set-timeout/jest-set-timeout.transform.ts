import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../identifiers';

export const jestSetTimeoutTransform = defineFileTransform({
  name: 'jest-set-timeout',
  findingType: findingTypes.jestSymbol,
  apply: _rewriteJestSetTimeout,
});

function _rewriteJestSetTimeout(content: string): string {
  const editor = new SgEditor(content);
  const nodes = editor.root.findAll('jest.setTimeout($ARG)');

  for (const node of nodes) {
    const arg = node.getMatch('ARG')?.text() ?? '';
    const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
    editor.replaceNode(node, `${vi}.setConfig({ testTimeout: ${arg} })`);
  }

  return editor.commit();
}
