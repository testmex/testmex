import { SgNode } from '@ast-grep/napi';
import { defineTransform } from '../../../../core/models/transform';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { fileTags } from '../../identifiers';
import { vitestSetupFilePath as toVitestSetupFilePath } from '../../utils';

const JEST_PRESET_ANGULAR_MODULE_PREFIX = 'jest-preset-angular';

export const setupFilesTransform = defineTransform({
  name: 'setup-files',
  apply: async ({ workspace, onProgress }) => {
    let transformedCount = 0;

    for (const file of workspace.files) {
      if (!_isJestSetupFile(file.tags)) {
        continue;
      }

      const vitestPath = toVitestSetupFilePath(file.path);
      const existingClone = await workspace.tree.maybeReadFile(vitestPath);

      if (existingClone != null) {
        continue;
      }

      const content = await workspace.tree.maybeReadFile(file.path);

      if (content == null) {
        continue;
      }

      workspace.tree.write(vitestPath, _transformSetupFileContent(content));
      workspace.tag(vitestPath, fileTags.code);
      transformedCount++;
    }

    onProgress?.(`${transformedCount} file(s) transformed`);
  },
});

function _transformSetupFileContent(content: string): string {
  const editor = new SgEditor(content);
  const importedSymbols = _removeJestPresetAngularImports(editor);

  for (const symbol of importedSymbols) {
    for (const call of editor.root.findAll(`${symbol}($$$ARGS)`)) {
      const parent = call.parent();
      const node = parent?.kind() === 'expression_statement' ? parent : call;
      editor.replaceNode(node, '');
    }
  }

  return editor.commit();
}

function _removeJestPresetAngularImports(editor: SgEditor): Set<string> {
  const importedSymbols = new Set<string>();

  for (const imp of editor.root.findAll('import { $$$NAMES } from $SOURCE')) {
    if (!_isJestPresetAngularModule(imp)) {
      continue;
    }

    for (const specifier of imp.findAll({
      rule: { kind: 'import_specifier' },
    })) {
      const localName = specifier.text().trim().replace(/,$/, '');
      if (localName != null) {
        importedSymbols.add(localName);
      }
    }

    editor.replaceNode(imp, '');
  }

  return importedSymbols;
}

function _isJestPresetAngularModule(imp: SgNode): boolean {
  const source = imp
    .getMatch('SOURCE')
    ?.find({ rule: { kind: 'string_fragment' } })
    ?.text();

  return (
    source != null &&
    (source === JEST_PRESET_ANGULAR_MODULE_PREFIX ||
      source.startsWith(`${JEST_PRESET_ANGULAR_MODULE_PREFIX}/`))
  );
}

function _isJestSetupFile(tags: readonly string[]): boolean {
  return tags.includes(fileTags.jestSetup);
}
