import { SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../../core/domain/define-file-transform';
import {
  findEnclosingCallable,
  markCallableAsync,
  noIntermediateOfKind,
} from '../../../../infra/ast/ast-utils';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../../identifiers';

export const jestMockTransform = defineFileTransform({
  name: 'jest-mock',
  findingType: findingTypes.jestSymbol,
  apply: (content) => {
    const editor = new SgEditor(content);

    _replaceJestWithVitestAsyncApi({ editor });

    const mockCalls = [
      ...editor.root.findAll('jest.mock($MODULE)'),
      ...editor.root.findAll('jest.mock($MODULE, () => $BODY)'),
      ...editor.root.findAll('jest.mock($MODULE, async () => $BODY)'),
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
           * `() => { return 42; }` -> `() => { return { default: 42; } }`
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
  },
});

const jestToVitestAsyncApi = {
  createMockFromModule: 'importMock',
  requireMock: 'importMock',
  requireActual: 'importActual',
} as const;

function _replaceJestWithVitestAsyncApi({
  editor,
}: {
  editor: SgEditor;
}): void {
  const matches = Object.entries(jestToVitestAsyncApi).flatMap(
    ([jestApi, vitestAsyncApi]) => {
      return [
        ...editor.root.findAll(`jest.${jestApi}($MODULE)`),
        ...editor.root.findAll(
          `jest.${jestApi}<typeof import($TYPE_MODULE)>($MODULE)`,
        ),
        ...editor.root.findAll(`jest.${jestApi}<$TYPE>($MODULE, () => $BODY)`),
      ].map((jestCall) => ({
        jestCall,
        vitestAsyncApi,
      }));
    },
  );

  /* `jest.mock` callback might contain multiple requireActual calls,
   * but we do not want to add `async` twice. */
  const markedAsyncCallables = new Set<number>();

  for (const { jestCall, vitestAsyncApi } of matches) {
    const vi = ensureVitestSymbol({ editor, symbol: 'vi' });

    const type = jestCall.getMatch('TYPE');
    const typeModule = jestCall.getMatch('TYPE_MODULE');
    const typeParams = type
      ? `<${type.text()}>`
      : typeModule
        ? `<typeof import(${typeModule.text()})>`
        : '';
    const importActual = `(await ${vi}.${vitestAsyncApi}${typeParams}(${jestCall.getMatch('MODULE')?.text()}))`;

    editor.replaceNode(jestCall, importActual);

    const enclosing = findEnclosingCallable(jestCall);
    /* Make enclosing callable async if it is not already. */
    if (enclosing != null && !markedAsyncCallables.has(enclosing.id())) {
      markCallableAsync({ callable: enclosing, editor });
      markedAsyncCallables.add(enclosing.id());
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
    const returnValue = returnStmt.getMatch('RETURN');
    const returnTxt = returnValue?.text();
    if (
      returnTxt != null &&
      returnValue != null &&
      noIntermediateOfKind(returnStmt, body, [
        'arrow_function',
        'function_expression',
        'function_declaration',
      ]) &&
      !_objectExpressionHasDefaultProperty(returnStmt) &&
      !_isObjectLiteralReturn(returnValue)
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
