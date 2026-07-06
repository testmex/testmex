import type { SgNode } from '@ast-grep/napi';
import type { SgRootNode } from '../../infra/ast/sg-editor';

export function findJestConfig(
  root: SgRootNode,
): Record<string, SgNode> | undefined {
  const pairs = root
    .find('module.exports = $CONFIG')
    ?.getMatch('CONFIG')
    ?.children()
    ?.filter((c) => c.kind() === 'pair');

  if (pairs == null) {
    return undefined;
  }

  const config: Record<string, SgNode> = {};

  for (const pair of pairs) {
    const key = pair.child(0)?.text();

    if (key != null) {
      config[key] = pair;
    }
  }

  return config;
}
