import { defineFileTransform } from '../../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../../../identifiers';
import { isTransformable } from '../../../jest-core';
import { JEST_GLOBALS } from './jest-globals';

export const vitestImportsTransform = defineFileTransform({
  name: 'vitest-imports',
  fileTags: (tags) => isTransformable(tags),
  findingType: findingTypes.vitestImportsNeeded,
  apply: (content) => {
    const editor = new SgEditor(content);

    for (const identifierUsage of JEST_GLOBALS.map((jestGlobal) =>
      editor.root.find(jestGlobal),
    ).filter((node) => node != null)) {
      const jestIdentifierText =
        identifierUsage.text() as (typeof JEST_GLOBALS)[number];
      ensureVitestSymbol({ editor, symbol: jestIdentifierText });
    }

    return editor.commit();
  },
});
