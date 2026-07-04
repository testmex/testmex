import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';

export const testingLibraryJestDomTransform = defineFileTransform({
  name: 'testing-library-jest-dom',
  findingType: findingTypes.testingLibraryJestDom,
  apply: (content) => {
    const editor = new SgEditor(content);

    for (const imp of editor.root.findAll('import $SOURCE')) {
      const source = imp
        .getMatch('SOURCE')
        ?.find({ rule: { kind: 'string_fragment' } })
        ?.text();

      if (source !== '@testing-library/jest-dom') {
        continue;
      }

      editor.replaceNode(
        imp,
        `if (!process.env.VITEST) {
  require('@testing-library/jest-dom')
}
`,
      );
    }

    return editor.commit();
  },
});
