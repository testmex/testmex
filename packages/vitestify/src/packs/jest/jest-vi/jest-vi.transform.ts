import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../identifiers';

const apiNamesRecord: Record<string, string> = {
  deepUnmock: 'unmock',
};

export const jestViTransform = defineFileTransform({
  name: 'jest-vi',
  findingType: findingTypes.jestSymbol,
  apply: _rewriteJestVi,
});

function _rewriteJestVi(content: string): string {
  const editor = new SgEditor(content);
  for (const call of editor.root.findAll('jest.$METHOD')) {
    const method = call.getMatch('METHOD')?.text();
    if (method == null) {
      continue;
    }

    const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
    const viMethod = apiNamesRecord[method] ?? method;
    editor.replaceNode(call, `${vi}.${viMethod}`);
  }

  return editor.commit();
}
