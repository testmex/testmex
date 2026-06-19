import { defineFileContentHeuristic } from '../../../core/domain/define-file-content-heuristic';
import { projectFileTags as coreProjectFileTags } from '../../core/identifiers';
import { findingTypes } from '../identifiers';
import { jestGlobals } from './jest-globals';

type VitestGlobal = (typeof jestGlobals)[number];

export const vitestImportsHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(coreProjectFileTags.test),
  inspect: ({ file, project, content }) => {
    const usedGlobals = _collectUsedVitestGlobals(content);

    if (usedGlobals.length === 0) {
      return [];
    }

    const missingGlobals = _getMissingVitestImports(content, usedGlobals);

    if (missingGlobals.length === 0) {
      return [];
    }

    return [
      {
        type: findingTypes.vitestImportsNeeded,
        project,
        file,
      },
    ];
  },
});

export function _collectUsedVitestGlobals(content: string): VitestGlobal[] {
  const used = new Set<VitestGlobal>();

  for (const global of jestGlobals) {
    if (_usesVitestGlobal(content, global)) {
      used.add(global);
    }
  }

  return jestGlobals.filter((global) => used.has(global));
}

function _usesVitestGlobal(content: string, global: VitestGlobal): boolean {
  return new RegExp(`\\b${global}\\s*(?:[(.]|$)`).test(content);
}

function _getMissingVitestImports(
  content: string,
  usedGlobals: VitestGlobal[],
): VitestGlobal[] {
  const importedGlobals = _parseVitestImportNames(content);

  return usedGlobals.filter((global) => !importedGlobals.has(global));
}

function _parseVitestImportNames(content: string): Set<string> {
  const imported = new Set<string>();
  const importPattern = /import\s+\{([^}]+)\}\s+from\s+['"]vitest['"]/g;

  for (const match of content.matchAll(importPattern)) {
    for (const name of match[1].split(',')) {
      const trimmed = name.trim();

      if (trimmed.length > 0) {
        imported.add(trimmed);
      }
    }
  }

  return imported;
}
