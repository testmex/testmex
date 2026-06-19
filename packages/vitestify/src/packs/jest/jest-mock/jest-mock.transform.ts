import { SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import {
  findEnclosingCallable,
  markCallableAsync,
  noIntermediateOfKind,
} from '../../../infra/ast/ast-utils';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../identifiers';

export const jestMockTransform = defineFileTransform({
  findingType: findingTypes.jestSymbol,
  apply: _rewriteDefaultExportMocks,
});

const jestToVitestAsyncApi = {
  createMockFromModule: 'importMock',
  requireMock: 'importMock',
  requireActual: 'importActual',
} as const;

function _rewriteDefaultExportMocks(content: string): string {
  const editor = new SgEditor(content);

  for (const [jestApi, vitestAsyncApi] of Object.entries(
    jestToVitestAsyncApi,
  )) {
    _replaceJestWithVitestAsyncApi({ editor, jestApi, vitestAsyncApi });
  }

  const mockCalls = [
    ...editor.root.findAll('jest.mock($MODULE)'),
    ...editor.root.findAll('jest.mock($MODULE, () => $BODY)'),
  ];

  for (const jestMockCall of mockCalls) {
    const body = jestMockCall.getMatch('BODY');
    const factory = body?.parent();

    /**
     * Skip when `default` property is already present:
     * `jest.mock(…, () => ({ default: … }))`
     */
    if (
      body?.kind() === 'parenthesized_expression' &&
      _objectExpressionHasDefaultProperty(body)
    ) {
      continue;
    }

    if (factory != null && body != null) {
      if (body.kind() === 'statement_block') {
        /**
         * `() => { return 42; }` -> `() => { ret`urn { default: 42; } }`
         */
        _rewriteReturnStatements({ body, editor });
      } else if (!_isObjectLiteralReturn(body)) {
        /**
         * `() => (42)` -> `() => ({ default: 42 })`
         */
        _rewriteInlineArrow({ body, editor });
      }
    }

    _rewriteJestCalleeToVi({ jestMockCall, editor });
  }

  return editor.commit();
}

function _replaceJestWithVitestAsyncApi({
  editor,
  jestApi,
  vitestAsyncApi,
}: {
  editor: SgEditor;
  jestApi: string;
  vitestAsyncApi: string;
}): void {
  for (const jestCall of editor.root.findAll(
    `jest.${jestApi}($MODULE)`,
  )) {
    const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
    const importActual = `(await ${vi}.${vitestAsyncApi}(${jestCall.getMatch('MODULE')?.text()}))`;
    editor.replaceNode(jestCall, importActual);

    const enclosing = findEnclosingCallable(jestCall);
    if (enclosing != null) {
      markCallableAsync({ callable: enclosing, editor });
    }
  }
}

function _isObjectLiteralReturn(body: SgNode): boolean {
  if (body.kind() === 'object') {
    return true;
  }

  if (body.kind() === 'parenthesized_expression') {
    return body.child(1)?.kind() === 'object';
  }

  return false;
}

function _rewriteReturnStatements({
  body,
  editor,
}: {
  body: SgNode;
  editor: SgEditor;
}): void {
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
}

function _rewriteInlineArrow({
  body,
  editor,
}: {
  body: SgNode;
  editor: SgEditor;
}): void {
  editor.replaceNode(body, `({ default: ${body.text()} })`);
}

function _rewriteJestCalleeToVi({
  jestMockCall,
  editor,
}: {
  jestMockCall: SgNode;
  editor: SgEditor;
}): void {
  const callee = jestMockCall.child(0);
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
