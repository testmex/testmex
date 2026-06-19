import { Edit, Lang, parse, SgNode } from '@ast-grep/napi';

interface ModuleImportState {
  symbols: Set<string>;
  types: Set<string>;
  topImportEditIndex?: number;
}

export class SgEditor {
  readonly root: SgRootNode;
  private readonly _edits: Edit[] = [];
  private readonly _moduleState: Map<string, ModuleImportState> = new Map();

  constructor(content: string, lang = Lang.TypeScript) {
    this.root = parse(lang, content).root();
  }

  commit(): string {
    return this.root.commitEdits(this._edits);
  }

  ensureSymbol(args: { symbol: string; module: string }): string {
    return this._ensureImport({ ...args, kind: 'value' });
  }

  ensureTypeSymbol(args: { symbol: string; module: string }): string {
    return this._ensureImport({ ...args, kind: 'type' });
  }

  insertBefore(node: SgNode, text: string): void {
    const start = node.range().start.index;
    this._edits.push({
      startPos: start,
      endPos: start,
      insertedText: text,
    });
  }

  replaceNode(node: SgNode, replacement: string): void {
    this._edits.push(node.replace(replacement));
  }

  private _ensureImport(args: {
    symbol: string;
    module: string;
    kind: 'value' | 'type';
  }): string {
    const { symbol, module, kind } = args;
    const state = this._getOrCreateModuleState(module);
    const ensured = kind === 'value' ? state.symbols : state.types;

    if (ensured.has(symbol)) {
      return symbol;
    }

    const existingImports = _findModuleImports(this.root, module);
    const fileSymbols = new Set(existingImports.flatMap((i) => i.symbols));
    const fileTypes = new Set(existingImports.flatMap((i) => i.types));

    if (kind === 'value' ? fileSymbols.has(symbol) : fileTypes.has(symbol)) {
      ensured.add(symbol);
      return symbol;
    }

    ensured.add(symbol);
    this._syncModuleImport(module);

    return symbol;
  }

  private _getOrCreateModuleState(module: string): ModuleImportState {
    let state = this._moduleState.get(module);
    if (!state) {
      state = { symbols: new Set(), types: new Set() };
      this._moduleState.set(module, state);
    }
    return state;
  }

  private _syncModuleImport(module: string): void {
    const state = this._getOrCreateModuleState(module);
    const existingImports = _findModuleImports(this.root, module);

    const symbols = new Set([
      ...existingImports.flatMap((i) => i.symbols),
      ...state.symbols,
    ]);
    const types = new Set([
      ...existingImports.flatMap((i) => i.types),
      ...state.types,
    ]);

    const importText = _formatModuleImport(module, [...symbols], [...types]);

    if (existingImports.length > 0) {
      this.replaceNode(existingImports[0].node, importText);
      for (let i = 1; i < existingImports.length; i++) {
        this.replaceNode(existingImports[i].node, '');
      }
      state.topImportEditIndex = undefined;
    } else if (state.topImportEditIndex !== undefined) {
      this._edits[state.topImportEditIndex].insertedText = `${importText}\n`;
    } else {
      state.topImportEditIndex = this._insertAtTop(`${importText}\n`);
    }
  }

  private _insertAtTop(text: string): number {
    const firstNonCommentStatement = this.root
      .children()
      .find((child) => child.kind() !== 'comment');
    const position = firstNonCommentStatement?.range().start.index ?? 0;

    const editIndex = this._edits.length;
    this._edits.push({
      startPos: position,
      endPos: position,
      insertedText: text,
    });

    return editIndex;
  }
}

export type SgRootNode = ReturnType<ReturnType<typeof parse>['root']>;

function _findModuleImports(
  root: SgRootNode,
  module: string,
): Array<{ node: SgNode; symbols: string[]; types: string[] }> {
  const results: Array<{ node: SgNode; symbols: string[]; types: string[] }> =
    [];

  for (const imp of root.findAll('import { $$$NAMES } from $SOURCE')) {
    const source = _importSource(imp);
    if (source !== module) {
      continue;
    }

    const parsed = _parseValueImportNames(imp.getMultipleMatches('NAMES'));
    results.push({ node: imp, ...parsed });
  }

  for (const imp of root.findAll('import type { $$$NAMES } from $SOURCE')) {
    const source = _importSource(imp);
    if (source !== module) {
      continue;
    }

    results.push({
      node: imp,
      symbols: [],
      types: imp
        .getMultipleMatches('NAMES')
        .map((name) => name.text().trim())
        .filter((name) => name !== '' && name !== ','),
    });
  }

  return results;
}

function _importSource(imp: SgNode): string | undefined {
  return imp
    .getMatch('SOURCE')
    ?.find({ rule: { kind: 'string_fragment' } })
    ?.text();
}

function _parseValueImportNames(
  names: SgNode[],
): { symbols: string[]; types: string[] } {
  const symbols: string[] = [];
  const types: string[] = [];

  for (const name of names) {
    const text = name.text().trim();
    if (text === '' || text === ',') {
      continue;
    }
    if (text.startsWith('type ')) {
      types.push(text.slice('type '.length).trim());
    } else {
      symbols.push(text);
    }
  }

  return { symbols, types };
}

function _formatModuleImport(
  module: string,
  symbols: string[],
  types: string[],
): string {
  if (symbols.length === 0) {
    return `import type { ${types.join(', ')} } from '${module}';`;
  }

  const parts = [...symbols, ...types.map((type) => `type ${type}`)];
  return `import { ${parts.join(', ')} } from '${module}';`;
}
