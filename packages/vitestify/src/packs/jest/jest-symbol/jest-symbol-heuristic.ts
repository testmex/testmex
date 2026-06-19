import type { Finding } from '../../../core/models/finding';
import type { Heuristic } from '../../../core/models/heuristic';
import { projectFileTags as coreProjectFileTags } from '../../core/identifiers';
import { findingTypes } from '../identifiers';

export const jestSymbolHeuristic: Heuristic = {
  inspect: async ({ info, tree }): Promise<Finding[]> => {
    const testFiles = await Promise.all(
      info.projects.flatMap((project) =>
        project.files
          .filter((file) => file.tags.includes(coreProjectFileTags.test))
          .map((file) => ({ project, file })),
      ),
    );

    const findings: Finding[] = [];
    for (const { file, project } of testFiles) {
      const content = await tree.maybeReadFile(file.path);
      if (content === null) {
        continue;
      }

      findings.push({
        type: findingTypes.jestSymbol,
        project,
        file,
      });
    }

    return findings;
  },
};
