import jscodeshift from 'jscodeshift';
import type { Finding } from '../../core/finding';
import type { Transform } from '../../core/transform';
import type { Workspace } from '../../core/workspace';
import { findingTypes } from './findings';

function rewriteJestMock(content: string): string {
  const root = jscodeshift(content);

  root
    .find(jscodeshift.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'jest' },
        property: { type: 'Identifier', name: 'mock' },
      },
    })
    .forEach((path) => {
      const callee = path.node.callee;

      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier'
      ) {
        callee.object.name = 'vi';
      }
    });

  return root.toSource();
}

export const jestMockTransform: Transform = {
  apply: async (workspace: Workspace, findings: Finding[]): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.jestMockCall ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content === null) {
        continue;
      }

      await tree.write(finding.file.path, rewriteJestMock(content));
    }
  },
};
