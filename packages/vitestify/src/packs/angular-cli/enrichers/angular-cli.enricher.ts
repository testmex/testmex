import type { ReadonlyWorkspace } from '../../../core/domain/workspace';
import { type Project } from '../../../core/domain/workspace';
import { Enricher } from '../../../core/models/enricher';
import { relativePath } from '../../../core/models/relative-path';
import { ANGULAR_JSON_PATH, type AngularJson } from '../../core/angular-json';

export class AngularCliEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const angularJson = await workspace.tree.maybeReadFile(ANGULAR_JSON_PATH);

    if (angularJson === null) {
      return {};
    }

    const config: AngularJson = JSON.parse(angularJson);

    const projects: Project[] = Object.entries(config.projects ?? {}).flatMap(
      ([name, meta]) =>
        meta.root != null ? [{ name, path: relativePath(meta.root) }] : [],
    );

    return { projects };
  }
}
