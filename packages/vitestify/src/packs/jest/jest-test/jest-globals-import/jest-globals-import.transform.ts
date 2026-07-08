import { defineFileTransform } from '../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { findingTypes } from '../../identifiers';
import { isTransformable } from '../../utils';

export const jestGlobalsImportTransform = defineFileTransform({
  name: 'jest-globals-import',
  fileTags: (tags) => isTransformable(tags),
  findingType: findingTypes.jestSymbol,
  apply: (content) => {
    const editor = new SgEditor(content);
    const imports = editor.root
      .findAll('import { $$$NAMES } from $SOURCE')
      .filter(
        (imp) =>
          imp
            .getMatch('SOURCE')
            ?.find({ rule: { kind: 'string_fragment' } })
            ?.text() === '@jest/globals',
      );

    for (const imp of imports) {
      const specifiers = imp
        .findAll({ rule: { kind: 'import_specifier' } })
        .map((specifier) => specifier.text())
        .map((name) => (name === 'jest' ? 'vi' : name));

      editor.replaceNode(
        imp,
        `import { ${specifiers.join(', ')} } from 'vitest';`,
      );
    }

    return editor.commit();
  },
});
