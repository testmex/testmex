import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';

export const replaceApiTransform = defineFileTransform({
  findingType: findingTypes.jestSymbol,
  apply: _rewriteReplaceApi,
});

function _rewriteReplaceApi(content: string): string {
  let result = _rewriteFitCalls(content);
  result = _rewriteFailingCalls(result);
  return _rewriteLegacySkipAndFocusCalls(result);
}

function _rewriteFitCalls(content: string): string {
  const editor = new SgEditor(content);
  const fitSites = [
    ...editor.root.findAll('fit($$$ARGS)'),
    ...editor.root.findAll('fit.$PROP'),
  ];

  if (fitSites.length === 0) {
    return content;
  }

  for (const node of fitSites) {
    editor.replaceNode(node, node.text().replace(/^fit\b/, 'it.only'));
  }

  return editor.commit();
}

function _rewriteFailingCalls(content: string): string {
  const editor = new SgEditor(content);
  const failingCalls = [
    ...editor.root.findAll('it.failing($$$ARGS)'),
    ...editor.root.findAll('test.failing($$$ARGS)'),
    ...editor.root.findAll('it.only.failing($$$ARGS)'),
    ...editor.root.findAll('it.skip.failing($$$ARGS)'),
    ...editor.root.findAll('test.only.failing($$$ARGS)'),
    ...editor.root.findAll('test.skip.failing($$$ARGS)'),
  ];

  if (failingCalls.length === 0) {
    return content;
  }

  for (const node of failingCalls) {
    editor.replaceNode(node, node.text().replace(/\.failing\b/, '.fails'));
  }

  return editor.commit();
}

function _rewriteLegacySkipAndFocusCalls(content: string): string {
  const editor = new SgEditor(content);
  const legacyCalls = [
    ...editor.root.findAll('xit($$$ARGS)'),
    ...editor.root.findAll('xdescribe($$$ARGS)'),
    ...editor.root.findAll('xtest($$$ARGS)'),
    ...editor.root.findAll('fdescribe($$$ARGS)'),
  ];

  if (legacyCalls.length === 0) {
    return content;
  }

  for (const node of legacyCalls) {
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
}
