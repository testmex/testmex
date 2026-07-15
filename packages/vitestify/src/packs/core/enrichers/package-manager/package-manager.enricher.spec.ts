import { describe, expect, it } from 'vitest';
import { Tree } from '../../../../core/domain/tree';
import { Workspace } from '../../../../core/domain/workspace';
import {
  relativePath,
  type RelativePath,
} from '../../../../core/models/relative-path';
import { WorkspaceState } from '../../../../core/models/workspace-state';
import { FileSystemFake } from '../../../../core/ports/file-system.fake';
import { CommandRunnerFake } from '../../../../core/ports/command-runner.fake';
import { PackageManagerEnricher } from './package-manager.enricher';

describe(PackageManagerEnricher, () => {
  it('detects pnpm from package.json packageManager field', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({
        packageManager: 'pnpm@11.0.0',
      }),
    });

    expect(result.packageManager).toBe('pnpm');
  });

  it('detects npm from package.json packageManager field', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({
        packageManager: 'npm@10.0.0',
      }),
    });

    expect(result.packageManager).toBe('npm');
  });

  it('detects yarn from package.json packageManager field', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({
        packageManager: 'yarn@4.0.0',
      }),
    });

    expect(result.packageManager).toBe('yarn');
  });

  it('detects pnpm from pnpm-lock.yaml', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({}),
      [relativePath('pnpm-lock.yaml')]: 'lockfileVersion: 9.0',
    });

    expect(result.packageManager).toBe('pnpm');
  });

  it('detects yarn from yarn.lock', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({}),
      [relativePath('yarn.lock')]: '# yarn lockfile v1',
    });

    expect(result.packageManager).toBe('yarn');
  });

  it('detects npm from package-lock.json', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({}),
      [relativePath('package-lock.json')]: JSON.stringify({
        lockfileVersion: 3,
      }),
    });

    expect(result.packageManager).toBe('npm');
  });

  it('prefers package.json packageManager field over lock files', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({
        packageManager: 'yarn@4.0.0',
      }),
      [relativePath('pnpm-lock.yaml')]: 'lockfileVersion: 9.0',
    });

    expect(result.packageManager).toBe('yarn');
  });

  it('prefers pnpm lock over npm lock', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({}),
      [relativePath('pnpm-lock.yaml')]: 'lockfileVersion: 9.0',
      [relativePath('package-lock.json')]: JSON.stringify({
        lockfileVersion: 3,
      }),
    });

    expect(result.packageManager).toBe('pnpm');
  });

  it('returns empty result when nothing matches', async () => {
    const result = await enrich({
      [relativePath('package.json')]: JSON.stringify({}),
    });

    expect(result).toEqual({});
  });
});

async function enrich(files: Record<RelativePath, string>) {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(files);

  const enricher = new PackageManagerEnricher();

  return enricher.enrich({
    commandRunner: new CommandRunnerFake(),
    workspace: new Workspace({
      state: new WorkspaceState(),
      tree: new Tree({ fileSystem }),
    }),
  });
}
