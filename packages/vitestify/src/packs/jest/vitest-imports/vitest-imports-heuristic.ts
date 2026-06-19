import type { Finding } from '../../../core/models/finding';
import type { Heuristic } from '../../../core/models/heuristic';
import type { Project, ProjectFile } from '../../../core/models/workspace-info';
import { projectFileTags as coreProjectFileTags } from '../../core/identifiers';
import { findingTypes } from '../identifiers';

export const vitestGlobals = [
  'describe',
  'it',
  'test',
  'expect',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
  'vi',
] as const;

type VitestGlobal = (typeof vitestGlobals)[number];

interface TestFileEntry {
  file: ProjectFile;
  project: Project;
  content: string | null;
}

export const vitestImportsHeuristic: Heuristic = {
  inspect: async ({ info, tree }): Promise<Finding[]> => {
    const testFiles = await Promise.all(
      info.projects
        .flatMap((project) =>
          project.files
            .filter((file) => file.tags.includes(coreProjectFileTags.test))
            .map((file) => ({ project, file })),
        )
        .map(async ({ file, project }) => ({
          file,
          project,
          content: await tree.maybeReadFile(file.path),
        })),
    );

    return _collectVitestImportsFindings(testFiles);
  },
};

function _collectVitestImportsFindings(
  testFiles: TestFileEntry[],
): Finding[] {
  const findings: Finding[] = [];

  for (const { file, project, content } of testFiles) {
    if (content === null) {
      continue;
    }

    const usedGlobals = _collectUsedVitestGlobals(content);

    if (usedGlobals.length === 0) {
      continue;
    }

    const missingGlobals = _getMissingVitestImports(content, usedGlobals);

    if (missingGlobals.length === 0) {
      continue;
    }

    findings.push({
      type: findingTypes.vitestImportsNeeded,
      project,
      file,
    });
  }

  return findings;
}

export function _collectUsedVitestGlobals(content: string): VitestGlobal[] {
  const used = new Set<VitestGlobal>();

  for (const global of vitestGlobals) {
    if (_usesVitestGlobal(content, global)) {
      used.add(global);
    }
  }

  return vitestGlobals.filter((global) => used.has(global));
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
  const importPattern =
    /import\s+\{([^}]+)\}\s+from\s+['"]vitest['"]/g;

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
