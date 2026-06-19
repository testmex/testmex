import { SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { noIntermediateOfKind } from '../../../infra/ast/ast-utils';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';
import { ensureVitestSymbol } from '../../../infra/ast/vitest-ast-utils';

export const jestMockDefaultExportsTransform = defineFileTransform({
  findingType: findingTypes.defaultExportMockFactory,
  apply: _rewriteDefaultExportMocks,
});

function _rewriteDefaultExportMocks(content: string): string {
  const editor = new SgEditor(content);
  const mockCalls = editor.root.findAll('jest.mock($MODULE, () => $BODY)');

  for (const call of mockCalls) {
    const body = call.getMatch('BODY');
    const bodyTxt = body?.text();
    const moduleTxt = call.getMatch('MODULE')?.text();
    if (body == null || bodyTxt == null || moduleTxt == null) {
      continue;
    }

    /* jest.mock(…, () => { … }) */
    if (body.kind() === 'statement_block') {
      for (const returnStmt of body.findAll('return $RETURN')) {
        const returnTxt = returnStmt.getMatch('RETURN')?.text();
        if (
          returnTxt != null &&
          noIntermediateOfKind(returnStmt, body, [
            'arrow_function',
            'function_expression',
            'function_declaration',
          ]) &&
          !_objectExpressionHasDefaultProperty(returnStmt)
        ) {
          editor.replaceNode(returnStmt, `return { default: ${returnTxt} };`);
        }
      }
      _rewriteJestCalleeToVi(call, editor);
    } else if (!_objectExpressionHasDefaultProperty(body)) {
      const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
      /* jest.mock(…, () => (…)) */
      editor.replaceNode(
        call,
        `${vi}.mock(${moduleTxt}, () => ({ default: ${bodyTxt} }))`,
      );
    }
  }

  return editor.commit();
}

function _rewriteJestCalleeToVi(call: SgNode, editor: SgEditor): void {
  const callee = call.child(0);
  if (callee?.kind() !== 'member_expression') {
    return;
  }

  const jestId = callee.child(0);
  if (jestId?.text() === 'jest') {
    editor.replaceNode(jestId, ensureVitestSymbol({ editor, symbol: 'vi' }));
  }
}

function _objectExpressionHasDefaultProperty(node: SgNode): boolean {
  if (
    node.kind() !== 'return_statement' &&
    node.kind() !== 'parenthesized_expression'
  ) {
    return false;
  }
  const objectExpression = node.child(1);
  if (objectExpression == null || objectExpression.kind() !== 'object') {
    return false;
  }

  return [
    ...node.findAll('{default: $DEFAULT}'),
    ...node.findAll('{default: $DEFAULT, $$$REST}'),
  ].some((property) => {
    return noIntermediateOfKind(property, objectExpression, ['object']);
  });
}
