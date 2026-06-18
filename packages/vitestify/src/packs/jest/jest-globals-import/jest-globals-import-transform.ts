import { Lang, parse } from '@ast-grep/napi';
import type { Transform } from '../../../core/models/transform';
import { findingTypes } from '../identifiers';

export const jestGlobalsImportTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (finding.file === undefined) {
        continue;
      }

      const isGlobalsImport =
        finding.type === findingTypes.jestGlobalsImportFromGlobals;
      const isJestImport =
        finding.type === findingTypes.jestGlobalsImportFromJest;

      if (!isGlobalsImport && !isJestImport) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(
          finding.file.path,
          isGlobalsImport
            ? _rewriteJestGlobalsImport(content)
            : _rewriteJestPackageImport(content),
        );
      }
    }
  },
};

function _rewriteJestGlobalsImport(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const imports = root.findAll("import { $$$NAMES } from '@jest/globals'");

  if (imports.length === 0) {
    return content;
  }

  const edits = imports.map((imp) => {
    const names = imp
      .findAll({ rule: { kind: 'import_specifier' } })
      .map((specifier) => {
        const name = specifier.field('name')?.text() ?? specifier.text();

        return name === 'jest' ? 'vi' : name;
      });

    return imp.replace(`import { ${names.join(', ')} } from 'vitest';`);
  });

  return root.commitEdits(edits);
}

function _rewriteJestPackageImport(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const imports = root.findAll("import { $$$NAMES } from 'jest'");

  if (imports.length === 0) {
    return content;
  }

  const edits = imports.map((imp) => imp.replace(`import { vi } from 'vitest';`));

  return root.commitEdits(edits);
}
