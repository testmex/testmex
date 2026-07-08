import type { SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import type { SgRootNode } from '../../../infra/ast/sg-editor';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../../core/identifiers';

export const nxVitestWatchTransform = defineFileTransform({
  name: 'nx-vitest-watch',
  fileTags: [fileTags.vitestConfig],
  apply: (content) => {
    const editor = new SgEditor(content);
    const config = _findVitestConfig(editor.root);
    const testPair = config?.test;

    if (testPair == null) {
      return content;
    }

    const testConfig = _findVitestTestConfig(editor.root, testPair);

    if (testConfig?.watch != null) {
      return content;
    }

    const firstPair = Object.values(testConfig ?? {})[0];

    if (firstPair != null) {
      editor.replaceNode(firstPair, `watch: false,\n    ${firstPair.text()}`);
    } else {
      editor.replaceNode(testPair, 'test: {\n    watch: false,\n  }');
    }

    return editor.commit();
  },
});

function _findVitestConfig(
  root: SgRootNode,
): Record<string, SgNode> | undefined {
  const configNode =
    root.find('export default defineConfig($CONFIG)')?.getMatch('CONFIG') ??
    root.find('export default defineConfig(() => $CONFIG)')?.getMatch('CONFIG');

  return _findObjectPairs(configNode);
}

function _findVitestTestConfig(
  root: SgRootNode,
  testPair?: SgNode,
): Record<string, SgNode> | undefined {
  return _findObjectPairs(testPair ?? _findVitestConfig(root)?.test);
}

function _findObjectPairs(
  node: SgNode | null | undefined,
): Record<string, SgNode> | undefined {
  const objectNode =
    node?.kind() === 'object'
      ? node
      : node?.kind() === 'pair'
        ? node.child(2)?.kind() === 'object'
          ? node.child(2)
          : undefined
        : undefined;

  const pairs = objectNode
    ?.children()
    ?.filter((child) => child.kind() === 'pair');

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
