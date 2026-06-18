import { Lang, parse, type SgNode } from '@ast-grep/napi';
import { dirname, join } from 'node:path';
import type { ReadonlyTree } from '../../../core/domain/tree';
import { defineTransform } from '../../../core/models/transform';
import { relativePath, type RelativePath } from '../../../core/models/relative-path';
import { findingTypes } from '../identifiers';

const moduleExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export const defaultExportsTransform = defineTransform({
  apply: async ({ findings, workspace }) => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.defaultExportMockFactory ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(
          finding.file.path,
          await _rewriteDefaultExportMocks({
            content,
            filePath: finding.file.path,
            tree,
          }),
        );
      }
    }
  },
});

async function _rewriteDefaultExportMocks({
  content,
  filePath,
  tree,
}: {
  content: string;
  filePath: RelativePath;
  tree: ReadonlyTree;
}): Promise<string> {
  const root = parse(Lang.TypeScript, content).root();
  const mockCalls = [
    ...root.findAll('jest.mock($$$ARGS)'),
    ...root.findAll('jest.setMock($$$ARGS)'),
  ];

  if (mockCalls.length === 0) {
    return content;
  }

  const edits = [];

  for (const call of mockCalls) {
    const edit = await _rewriteMockCall({ call, filePath, tree });

    if (edit != null) {
      edits.push(edit);
    }
  }

  if (edits.length === 0) {
    return content;
  }

  return root.commitEdits(edits);
}

async function _rewriteMockCall({
  call,
  filePath,
  tree,
}: {
  call: SgNode;
  filePath: RelativePath;
  tree: ReadonlyTree;
}): Promise<{ startPos: number; endPos: number; insertedText: string } | null> {
  const argsNode = call.field('arguments');
  const args =
    argsNode
      ?.children()
      .filter(
        (child) =>
          child.kind() !== '(' &&
          child.kind() !== ')' &&
          child.kind() !== ',',
      ) ?? [];

  if (args.length < 2) {
    return null;
  }

  const moduleName = _readStringLiteral(args[0]);

  if (moduleName == null) {
    return null;
  }

  const factory = args[1];

  if (
    factory.kind() !== 'arrow_function' &&
    factory.kind() !== 'function_expression'
  ) {
    return null;
  }

  if (await _isObjectNamespaceModule({ tree, filePath, moduleName })) {
    return null;
  }

  if (factory.kind() === 'arrow_function') {
    const body = factory.field('body');

    if (body == null) {
      return null;
    }

    if (body.kind() === 'statement_block') {
      return _rewriteBlockFactory(factory);
    }

    if (_mockReturnAlreadyHasDefault(body)) {
      return null;
    }

    const params = factory.field('parameters')?.text() ?? '()';

    return factory.replace(`${params} => ({ default: ${body.text()} })`);
  }

  return _rewriteBlockFactory(factory);
}

function _rewriteBlockFactory(
  factory: SgNode,
): { startPos: number; endPos: number; insertedText: string } | null {
  const body = factory.field('body');

  if (body == null || body.kind() !== 'statement_block') {
    return null;
  }

  const returnStatement = body
    .children()
    .filter((child) => child.kind() === 'return_statement')
    .at(-1);

  if (returnStatement == null) {
    return null;
  }

  const returnValue = returnStatement
    .children()
    .find((child) => child.kind() !== 'return' && child.kind() !== ';');

  if (returnValue == null) {
    return null;
  }

  if (_objectExpressionHasDefaultProperty(returnValue)) {
    return null;
  }

  return returnValue.replace(`{ default: ${returnValue.text()} }`);
}

function _readStringLiteral(node: SgNode): string | null {
  const stringNode = node.find({ rule: { kind: 'string' } });

  if (stringNode == null) {
    return null;
  }

  const fragment = stringNode.find({ rule: { kind: 'string_fragment' } });

  return fragment?.text() ?? null;
}

function _unwrapParentheses(node: SgNode): SgNode {
  if (node.kind() !== 'parenthesized_expression') {
    return node;
  }

  const inner = node
    .children()
    .find((child) => child.kind() !== '(' && child.kind() !== ')');

  return inner == null ? node : _unwrapParentheses(inner);
}

function _mockReturnAlreadyHasDefault(node: SgNode): boolean {
  return _objectExpressionHasDefaultProperty(_unwrapParentheses(node));
}

function _objectExpressionHasDefaultProperty(node: SgNode): boolean {
  if (node.kind() !== 'object') {
    return false;
  }

  for (const property of node.findAll({ rule: { kind: 'pair' } })) {
    const key = property.field('key');

    if (key?.text() === 'default') {
      return true;
    }
  }

  return false;
}

async function _isObjectNamespaceModule({
  tree,
  filePath,
  moduleName,
}: {
  tree: ReadonlyTree;
  filePath: RelativePath;
  moduleName: string;
}): Promise<boolean> {
  if (!moduleName.startsWith('.')) {
    return false;
  }

  const resolvedBase = join(dirname(filePath), moduleName);

  for (const extension of moduleExtensions) {
    const modulePath = relativePath(`${resolvedBase}${extension}`);
    const content = await tree.maybeReadFile(modulePath);

    if (content != null) {
      return _moduleSourceHasNamedExports(content);
    }
  }

  return false;
}

function _moduleSourceHasNamedExports(content: string): boolean {
  const root = parse(Lang.TypeScript, content).root();

  for (const exportStatement of root.findAll({ rule: { kind: 'export_statement' } })) {
    const text = exportStatement.text().trimStart();

    if (/^export\s+default\b/.test(text)) {
      continue;
    }

    if (/^export\s*\{/.test(text)) {
      return true;
    }

    if (/^export\s+(const|let|var|function|class|enum|interface|type)\b/.test(text)) {
      return true;
    }
  }

  return false;
}
