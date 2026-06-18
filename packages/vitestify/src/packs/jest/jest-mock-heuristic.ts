import type { Finding } from '../../core/finding';
import type { Heuristic } from '../../core/heuristic';
import { projectFileTag } from '../../core/workspace-info';
import { findingTags, findingTypes } from './findings';

const jestMockPattern = /\bjest\.mock\s*\(/;

/**
 * @deprecated 🚧 work in progress
 */
export const jestMockHeuristic: Heuristic = {
  /**
   * @deprecated 🚧 work in progress
   */
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
