import { Enricher } from '../../../../core/models/enricher';
import type { ReadonlyWorkspace } from '../../../../core/domain/workspace';
import { fileTags } from '../../identifiers';
import { isCodeFile } from '../../utils';

export class CodeEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const files = [];
    for await (const path of workspace.tree.scanDirectory()) {
      files.push(path);
    }

    return {
      fileInfos: files
        .filter(isCodeFile)
        .map((path) => ({ path, tags: [fileTags.code] })),
    };
  }
}
