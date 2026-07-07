import { Enricher } from '../../core/models/enricher';
import type { ReadonlyWorkspace } from '../../core/domain/workspace';
import { relativePath } from '../../core/models/relative-path';
import {
  PACKAGE_MANAGERS,
  type PackageManager,
} from '../../core/models/workspace-info';

export class PackageManagerEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const packageManager =
      (await _detectFromPackageJson(workspace)) ??
      (await _detectFromLockFiles(workspace));

    if (packageManager === undefined) {
      return {};
    }

    return { packageManager };
  }
}

async function _detectFromPackageJson(
  workspace: ReadonlyWorkspace,
): Promise<PackageManager | undefined> {
  const packageJson = await workspace.tree.maybeReadJsonFile<PackageJson>(
    relativePath('package.json'),
  );

  if (packageJson?.packageManager === undefined) {
    return undefined;
  }

  const name = packageJson.packageManager.split('@')[0];
  return _isPackageManager(name) ? name : undefined;
}

async function _detectFromLockFiles(
  workspace: ReadonlyWorkspace,
): Promise<PackageManager | undefined> {
  if (
    (await workspace.tree.maybeReadFile(relativePath('pnpm-lock.yaml'))) !==
    null
  ) {
    return 'pnpm';
  }

  if (
    (await workspace.tree.maybeReadFile(relativePath('yarn.lock'))) !== null
  ) {
    return 'yarn';
  }

  if (
    (await workspace.tree.maybeReadFile(relativePath('package-lock.json'))) !==
    null
  ) {
    return 'npm';
  }

  return undefined;
}

function _isPackageManager(value: string): value is PackageManager {
  return PACKAGE_MANAGERS.includes(value as PackageManager);
}

interface PackageJson {
  packageManager?: string;
}
