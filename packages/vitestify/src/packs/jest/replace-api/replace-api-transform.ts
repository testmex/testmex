import { Lang, parse } from '@ast-grep/napi';
import type { Transform } from '../../../core/models/transform';
import { findingTypes } from '../identifiers';

export const replaceApiTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.replaceApiUsage ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _rewriteReplaceApi(content));
      }
    }
  },
};

function _rewriteReplaceApi(content: string): string {
  let result = _rewriteFitCalls(content);
  result = _rewriteFailingCalls(result);
  result = _rewriteLegacySkipAndFocusCalls(result);
  return result;
}

function _rewriteFitCalls(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const fitSites = [
    ...root.findAll('fit($$$ARGS)'),
    ...root.findAll('fit.$PROP'),
  ];

  if (fitSites.length === 0) {
    return content;
  }

  const edits = fitSites.map((node) =>
    node.replace(node.text().replace(/^fit\b/, 'it.only')),
  );

  return root.commitEdits(edits);
}

function _rewriteFailingCalls(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const failingCalls = [
    ...root.findAll('it.failing($$$ARGS)'),
    ...root.findAll('test.failing($$$ARGS)'),
    ...root.findAll('it.only.failing($$$ARGS)'),
    ...root.findAll('it.skip.failing($$$ARGS)'),
    ...root.findAll('test.only.failing($$$ARGS)'),
    ...root.findAll('test.skip.failing($$$ARGS)'),
  ];

  if (failingCalls.length === 0) {
    return content;
  }

  const edits = failingCalls.map((node) =>
    node.replace(node.text().replace(/\.failing\b/, '.fails')),
  );

  return root.commitEdits(edits);
}

function _rewriteLegacySkipAndFocusCalls(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const legacyCalls = [
    ...root.findAll('xit($$$ARGS)'),
    ...root.findAll('xdescribe($$$ARGS)'),
    ...root.findAll('xtest($$$ARGS)'),
    ...root.findAll('fdescribe($$$ARGS)'),
  ];

  if (legacyCalls.length === 0) {
    return content;
  }

  const edits = legacyCalls.map((node) =>
    node.replace(
      node
        .text()
        .replace(/^xit\b/, 'it.skip')
        .replace(/^xdescribe\b/, 'describe.skip')
        .replace(/^xtest\b/, 'test.skip')
        .replace(/^fdescribe\b/, 'describe.only'),
    ),
  );

  return root.commitEdits(edits);
}
