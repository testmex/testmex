import { SgNode } from '@ast-grep/napi';
import { Kinds, TypesMap } from '@ast-grep/napi/types/staticTypes';
import { SgEditor } from './sg-editor';

/**
 * Returns whether `node` sits under `ancestor` (or is the same node) without any intermediate node
 * whose kind appears in `kinds`.
 *
 * Walks from `node` toward the root, checking each parent until `ancestor` is
 * reached. If a forbidden kind is encountered first, returns `false`. If the
 * walk leaves the tree before reaching `ancestor`, returns `false`.
 *
 * Use this to tell direct structural containment apart from matches that live
 * inside a nested subtree — for example, a `return` that belongs to the mock
 * factory block vs. one inside a nested helper function.
 *
 * @example
 * ```ts
 * // jest.mock('./mod', () => {
 * //   if (condition) {
 * //     return function a() { return 'A'; }; // ✅ direct return in factory block
 * //   }
 * //   return function b() { return 'B'; };    // ✅ direct return in factory block
 * // });
 * const body = call.getMatch('BODY');
 * const returnStmt = body.find('return $RETURN');
 *
 * noIntermediateOfKind(returnStmt, body, [
 *   'arrow_function',
 *   'function_expression',
 *   'function_declaration',
 * ]);
 * // → true for both returns above
 *
 * // jest.mock('./mod', () => {
 * //   const helper = () => {
 * //     return function nested() { return 'N'; }; // ❌ return belongs to helper
 * //   };
 * //   return helper();
 * // });
 * noIntermediateOfKind(nestedReturn, body, [
 *   'arrow_function',
 *   'function_expression',
 *   'function_declaration',
 * ]);
 * // → false: `arrow_function` (helper) sits between the return and `body`
 * ```
 */
export function noIntermediateOfKind(
  node: SgNode,
  ancestor: SgNode,
  kinds: Kinds<TypesMap>[],
): boolean {
  if (node.id() === ancestor.id()) {
    return true;
  }

  for (const intermediate of node.ancestors()) {
    if (intermediate.id() === ancestor.id()) {
      return true;
    }

    if (kinds.includes(intermediate.kind())) {
      return false;
    }
  }

  return false;
}

export function findEnclosingCallable(node: SgNode): SgNode | null {
  let current: SgNode | null = node.parent();
  while (current != null && !enclosingCallableKinds.includes(current.kind())) {
    current = current.parent();
  }

  return current;
}

const enclosingCallableKinds: Kinds<TypesMap>[] = [
  'arrow_function',
  'function_expression',
  'function_declaration',
  'method_definition',
];

export function markCallableAsync({
  callable,
  editor,
}: {
  callable: SgNode;
  editor: SgEditor;
}): void {
  const params = callable.field('parameters');
  if (params == null) {
    return;
  }

  editor.insertBefore(params, 'async ');
}
