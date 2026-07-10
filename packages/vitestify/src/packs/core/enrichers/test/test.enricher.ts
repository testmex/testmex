import { Enricher, type EnricherOptions } from '../../../../core/models/enricher';
import { fileTags } from '../../identifiers';
import { isTestFile } from '../../utils';

export class TestEnricher implements Enricher {
  readonly name = 'test';

  async enrich({ workspace }: EnricherOptions) {
    const files = [];
    for await (const path of workspace.tree.scanDirectory()) {
      files.push(path);
    }

    return {
      fileInfos: [
        ...files
          .filter((file) => file.endsWith('.snap'))
          .map((path) => ({ path, tags: [fileTags.snapshot] })),
        ...files
          .filter((file) => isTestFile(file))
          .map((path) => ({ path, tags: [fileTags.test] })),
      ],
    };
  }
}
