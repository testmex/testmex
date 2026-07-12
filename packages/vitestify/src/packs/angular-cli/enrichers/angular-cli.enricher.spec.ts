import { describe, expect, it } from 'vitest';
import { Tree } from '../../../core/domain/tree';
import { Workspace } from '../../../core/domain/workspace';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { WorkspaceState } from '../../../core/models/workspace-state';
import { FileSystemFake } from '../../../core/ports/file-system.fake';
import { angularJsonMother } from '../angular-json.mother';
import { AngularCliEnricher } from './angular-cli.enricher';

describe(AngularCliEnricher, () => {
  it('discovers projects from angular.json with empty root', async () => {
    const result = await enrich({
      [relativePath('angular.json')]: angularJsonMother
        .withProject({ name: 'my-app', root: '' })
        .buildString(),
    });

    expect(result.projects).toEqual([
      { name: 'my-app', path: relativePath('') },
    ]);
  });
});

async function enrich(files: Record<RelativePath, string>) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(files);
  const enricher = new AngularCliEnricher();
  return enricher.enrich({
    workspace: new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem }),
    }),
  });
}
