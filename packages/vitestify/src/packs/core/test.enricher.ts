import { Enricher } from '../../core/models/enricher';
import type { ReadonlyWorkspace } from '../../core/domain/workspace';
import { fileTags } from './identifiers';
import { isTestFile } from './utils';

export class TestEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const files = await workspace.tree.scanDirectory();

    return {
      fileInfos: [
        ...files
          .filter((file) => file.endsWith('.snap'))
          .map((path) => ({ path, tags: [fileTags.snapshot] })),
        ...files
          .filter(isTestFile)
          .map((path) => ({ path, tags: [fileTags.test] })),
      ],
    };
  }
}
