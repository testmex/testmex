import type { Transform } from '../../../core/models/transform';
import { findingTypes } from '../identifiers';

export const snapTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.jestSnapshotFile ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _rewriteSnap(content));
      }
    }
  },
};

function _rewriteSnap(content: string): string {
  return content.replaceAll('Array [', '[').replaceAll('Object {', '{');
}
