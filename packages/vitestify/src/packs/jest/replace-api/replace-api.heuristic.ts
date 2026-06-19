import type { Finding } from '../../../core/models/finding';
import type { Heuristic } from '../../../core/models/heuristic';
import { projectFileTags as coreProjectFileTags } from '../../core/identifiers';
import { findingTypes } from '../identifiers';

const replaceApiPattern =
  /\bfit\s*(?:\(|\.)|(?:it|test)\.(?:only|skip)\.failing\b|(?:it|test)\.failing\b|\bxit\s*\(|\bxdescribe\s*\(|\bxtest\s*\(|\bfdescribe\s*\(/;

export const replaceApiHeuristic: Heuristic = {
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

    return testFiles
      .filter(
        ({ content }) => content !== null && replaceApiPattern.test(content),
      )
      .map(({ file, project }) => ({
        type: findingTypes.jestSymbol,
        project,
        file,
      }));
  },
};
