import type { Project } from '../../../core/domain/workspace';
import { Enricher, type EnricherOptions } from '../../../core/models/enricher';
import { relativePath } from '../../../core/models/relative-path';
import { ANGULAR_JSON_PATH, type AngularJson } from '../../core/angular-json';

export class AngularCliEnricher implements Enricher {
  readonly name = 'angular-cli';

  async enrich({ workspace, onProgress }: EnricherOptions) {
    const angularJson = await workspace.tree.maybeReadFile(ANGULAR_JSON_PATH);

    if (angularJson === null) {
      return {};
    }

    const config: AngularJson = JSON.parse(angularJson);

    const projects: Project[] = Object.entries(config.projects ?? {}).flatMap(
      ([name, meta]) =>
        meta.root != null ? [{ name, path: relativePath(meta.root) }] : [],
    );

    onProgress?.(`${projects.length} project(s) detected`);

    return { projects };
  }
}
