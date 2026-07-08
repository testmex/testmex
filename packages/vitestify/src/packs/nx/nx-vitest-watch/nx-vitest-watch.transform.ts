import type { SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { objectNodeToRecord } from '../../../infra/ast/ast-utils';
import type { SgRootNode } from '../../../infra/ast/sg-editor';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../../core/identifiers';

export const nxVitestWatchTransform = defineFileTransform({
  name: 'nx-vitest-watch',
  fileTags: [fileTags.vitestConfig],
  apply: (content) => {
    const editor = new SgEditor(content);
    const config = _findVitestConfig(editor.root);
    const testConfigNode = config?.test;
    const testConfigRecord = objectNodeToRecord(testConfigNode);

    if (
      testConfigNode == null ||
      testConfigRecord == null ||
      testConfigRecord.watch != null
    ) {
      return content;
    }

    const firstPair = testConfigNode
      .children()
      ?.find((c) => c.kind() === 'pair');

    if (firstPair) {
      editor.replaceNode(firstPair, `watch: false,\n    ${firstPair?.text()}`);
    } else {
      editor.replaceNode(testConfigNode, 'test: {\n    watch: false,\n  }');
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

  return objectNodeToRecord(configNode);
}
