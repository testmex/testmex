import type { Finding } from '../../../core/models/finding';
import type { Heuristic } from '../../../core/models/heuristic';
import type { Project } from '../../../core/models/workspace-info';
import type { ProjectFile } from '../../../core/models/workspace-info';
import { projectFileTags as coreProjectFileTags } from '../../core/identifiers';
import { findingTags, findingTypes } from '../identifiers';

const jestGlobalsFromGlobalsPattern = /from\s+['"]@jest\/globals['"]/;
const jestImportFromJestPattern = /from\s+['"]jest['"]/;
const jestSetMockPattern = /\bjest\.setMock\s*\(/;
const defaultExportMockFactoryPattern =
  /\bjest\.(mock|setMock)\s*\(\s*['"][^'"]+['"]\s*,\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function\b)/;
const jestMockPattern = /\bjest\.mock\s*\(/;
const jestViPattern = /\bjest\.(?!mock\b)\w+/;
const jestSetTimeoutPattern = /\bjest\.setTimeout\s*\(/;
const jestTypesPattern = /\bjest\.(Mock|MockedFunction|MockedFn)\b/;

interface TestFileEntry {
  file: ProjectFile;
  project: Project;
  content: string;
}

function collectJestSymbolFindings({
  file,
  project,
  content,
}: TestFileEntry): Finding[] {
  const findings: Finding[] = [];

  if (jestGlobalsFromGlobalsPattern.test(content)) {
    findings.push({
      type: findingTypes.jestGlobalsImportFromGlobals,
      tags: [findingTags.jest],
      description: `@jest/globals import in ${file.path}`,
      project,
      file,
    });
  }

  if (jestImportFromJestPattern.test(content)) {
    findings.push({
      type: findingTypes.jestGlobalsImportFromJest,
      tags: [findingTags.jest],
      description: `jest package import in ${file.path}`,
      project,
      file,
    });
  }

  if (jestSetMockPattern.test(content)) {
    findings.push({
      type: findingTypes.jestSetMockCall,
      tags: [findingTags.jest],
      description: `jest.setMock call in ${file.path}`,
      project,
      file,
    });
  }

  if (defaultExportMockFactoryPattern.test(content)) {
    findings.push({
      type: findingTypes.defaultExportMockFactory,
      tags: [findingTags.jest],
      description: `default-export mock factory in ${file.path}`,
      project,
      file,
    });
  }

  if (jestMockPattern.test(content)) {
    findings.push({
      type: findingTypes.jestMockCall,
      tags: [findingTags.jest],
      description: `jest.mock call in ${file.path}`,
      project,
      file,
    });
  }

  if (jestViPattern.test(content)) {
    findings.push({
      type: findingTypes.jestViCall,
      tags: [findingTags.jest],
      description: `jest.* call in ${file.path}`,
      project,
      file,
    });
  }

  if (jestSetTimeoutPattern.test(content)) {
    findings.push({
      type: findingTypes.jestSetTimeoutCall,
      tags: [findingTags.jest],
      description: `jest.setTimeout call in ${file.path}`,
      project,
      file,
    });
  }

  if (jestTypesPattern.test(content)) {
    findings.push({
      type: findingTypes.jestTypesUsage,
      tags: [findingTags.jest],
      description: `jest type usage in ${file.path}`,
      project,
      file,
    });
  }

  return findings;
}

export const jestSymbolHeuristic: Heuristic = {
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

    return testFiles.flatMap(({ file, project, content }) =>
      content === null
        ? []
        : collectJestSymbolFindings({ file, project, content }),
    );
  },
};
