import { defineFileTransform } from '../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { ensureVitestTypeSymbol } from '../../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../../identifiers';

const jestTypeReplacements = {
  MockedFunction: 'MockedFunction',
  MockedFn: 'MockedFunction',
  Mock: 'Mock',
} as const;

export const jestTypesTransform = defineFileTransform({
  name: 'jest-types',
  findingType: findingTypes.jestSymbol,
  apply: (content) => {
    const editor = new SgEditor(content);

    for (const node of editor.root.findAll({
      rule: { kind: 'nested_type_identifier' },
    })) {
      const namespace = node.field('module')?.text();
      const jestTypeName = node.field('name')?.text();
      if (
        namespace !== 'jest' ||
        jestTypeName == null ||
        !(jestTypeName in jestTypeReplacements)
      ) {
        continue;
      }

      const replacement =
        jestTypeReplacements[jestTypeName as keyof typeof jestTypeReplacements];

      editor.replaceNode(
        node,
        ensureVitestTypeSymbol({ editor, symbol: replacement }),
      );
    }

    return editor.commit();
  },
});
