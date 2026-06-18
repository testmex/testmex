import type { Finding } from '../../core/finding';
import type { Heuristic } from '../../core/heuristic';
import { projectFileTag } from '../../core/workspace-info';
import { findingTags, findingTypes } from './findings';

export const jestMockHeuristic: Heuristic = {
  inspect: async ({ info, tree }): Promise<Finding[]> => {
    const testFiles = await Promise.all(
      info.projects
        .flatMap((project) =>
          project.files
            .filter((file) => file.tags.includes(projectFileTag.test))
            .map((file) => ({ project, file })),
        )
        .map(async ({ file, project }) => ({
          file,
          project,
          content: await tree.maybeReadFile(file.path),
        })),
    );

    const jestMockPattern = /\bjest\.mock\s*\(/;

    return testFiles
      .filter(
        ({ content }) => content !== null && jestMockPattern.test(content),
      )
      .map(({ file, project }) => ({
        type: findingTypes.jestMockCall,
        tags: [findingTags.jest],
        description: `jest.mock call in ${file.path}`,
        project,
        file,
      }));
  },
};
