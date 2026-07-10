import { Edit, Lang, parse, SgNode } from '@ast-grep/napi';

export class SgEditor {
  readonly root: SgRootNode;
  private _edits: Edit[] = [];
  private _moduleState: Map<string, ModuleImportState> = new Map();

  constructor(content: string, lang = Lang.TypeScript) {
    this.root = parse(lang, content).root();
  }

  commit(): string {
    this._syncImportEdits();

    const content = this.root.commitEdits(this._edits);

    this._moduleState = new Map();
    this._edits = [];

    return content;
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

  /**
   * Makes sure that a symbol or type is imported or will add/update the imports accordingly.
   */
  private _ensureImport({
    symbol,
    module,
    kind,
  }: {
    symbol: string;
    module: string;
    kind: 'value' | 'type';
  }): string {
    let state = this._getOrCreateModuleState(module);

    /* This symbol was already ensured. */
    if ((kind === 'value' ? state.symbols : state.types).has(symbol)) {
      return symbol;
    }

    const existingImports = _findModuleImports(this.root, module);
    state = {
      symbols: new Set([
        ...existingImports.flatMap((i) => i.symbols),
        ...state.symbols,
        ...(kind === 'value' ? [symbol] : []),
      ]),
      types: new Set([
        ...existingImports.flatMap((i) => i.types),
        ...state.types,
        ...(kind === 'type' ? [symbol] : []),
      ]),
    };

    this._moduleState.set(module, state);
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

  private _syncImportEdits(): void {
    for (const [module, state] of this._moduleState) {
      const existingImports = _findModuleImports(this.root, module);
      const importText = _formatModuleImport(module, state);

      /* Replace the first import.
       * Deleting all nodes than inserting at the top does not work
       * as it creates two conflicting edits. */
      const firstImport = existingImports[0];
      if (firstImport != null) {
        this.replaceNode(firstImport.node, importText);
      } else {
        this._insertAtTop(`${importText}\n`);
      }

      /* Delete all other imports of the same module. */
      for (const imp of existingImports.slice(1)) {
        this.replaceNode(imp.node, '');
      }
    }
  }

  private _insertAtTop(text: string): void {
    const firstNonCommentStatement = this.root
      .children()
      .find((child) => child.kind() !== 'comment');
    const position = firstNonCommentStatement?.range().start.index ?? 0;

    /* This one is special and has to be applied first. */
    this._edits.unshift({
      startPos: position,
      endPos: position,
      insertedText: text,
    });
  }
}

export type SgRootNode = ReturnType<ReturnType<typeof parse>['root']>;

interface ModuleImportState {
  symbols: Set<string>;
  types: Set<string>;
}

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

function _parseValueImportNames(names: SgNode[]): {
  symbols: string[];
  types: string[];
} {
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
  { symbols, types }: ModuleImportState,
): string {
  if (symbols.size === 0) {
    return `import type { ${[...types].join(', ')} } from '${module}';`;
  }

  const parts = [...symbols, ...[...types].map((type) => `type ${type}`)];
  return `import { ${parts.join(', ')} } from '${module}';`;
}
