import { relativePath } from '../../core/models/relative-path';
import { type Project } from '../../core/domain/workspace';
import { Enricher } from '../../core/models/enricher';
import type { ReadonlyWorkspace } from '../../core/domain/workspace';

export class AngularCliEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const angularJson = await workspace.tree.maybeReadFile(
      relativePath('angular.json'),
    );

    if (angularJson === null) {
      return {};
    }

    const config: AngularJson = JSON.parse(angularJson);

    const projects: Project[] = Object.entries(config.projects ?? {}).map(
      ([name, meta]) => ({
        name,
        path: relativePath(meta.root),
      }),
    );

    return { projects };
  }
}

interface AngularJson {
  projects?: Record<string, { root: string }>;
}
