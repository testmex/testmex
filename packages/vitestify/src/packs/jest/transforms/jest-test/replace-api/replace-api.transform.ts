import { defineFileTransform } from '../../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../../infra/ast/sg-editor';
import { findingTypes } from '../../../identifiers';
import { isTransformable } from '../../../utils';

export const replaceApiTransform = defineFileTransform({
  name: 'replace-api',
  fileTags: (tags) => isTransformable(tags),
  findingType: findingTypes.jestSymbol,
  apply: (content) => {
    const editor = new SgEditor(content);

    for (const node of [
      ...editor.root.findAll('fit($$$ARGS)'),
      ...editor.root.findAll('fit.$PROP'),
    ]) {
      editor.replaceNode(
        node,
        node
          .text()
          .replace(/^fit.failing\b/, 'it.only.fails')
          .replace(/^fit\b/, 'it.only'),
      );
    }

    for (const node of [
      ...editor.root.findAll('it.failing($$$ARGS)'),
      ...editor.root.findAll('test.failing($$$ARGS)'),
      ...editor.root.findAll('it.only.failing($$$ARGS)'),
      ...editor.root.findAll('it.skip.failing($$$ARGS)'),
      ...editor.root.findAll('test.only.failing($$$ARGS)'),
      ...editor.root.findAll('test.skip.failing($$$ARGS)'),
    ]) {
      editor.replaceNode(node, node.text().replace(/\.failing\b/, '.fails'));
    }

    for (const node of [
      ...editor.root.findAll('xit($$$ARGS)'),
      ...editor.root.findAll('xdescribe($$$ARGS)'),
      ...editor.root.findAll('xtest($$$ARGS)'),
      ...editor.root.findAll('fdescribe($$$ARGS)'),
    ]) {
      editor.replaceNode(
        node,
        node
          .text()
          .replace(/^xit\b/, 'it.skip')
          .replace(/^xdescribe\b/, 'describe.skip')
          .replace(/^xtest\b/, 'test.skip')
          .replace(/^fdescribe\b/, 'describe.only'),
      );
    }

    return editor.commit();
  },
});
