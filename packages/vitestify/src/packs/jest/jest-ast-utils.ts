import type { SgNode } from '@ast-grep/napi';
import { objectNodeToRecord as objectNodeToRecord } from '../../infra/ast/ast-utils';
import type { SgRootNode } from '../../infra/ast/sg-editor';

export function findJestConfig(
  root: SgRootNode,
): Record<string, SgNode> | undefined {
  const configNode = root.find('module.exports = $CONFIG')?.getMatch('CONFIG');

  return objectNodeToRecord(configNode);
}
