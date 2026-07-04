import type { ReadonlyTree } from '../../core/domain/tree';
import { Enricher } from '../../core/models/enricher';
import { relativePath } from '../../core/models/relative-path';
import {
  PACKAGE_MANAGERS,
  type PackageManager,
  type WorkspaceInfo,
} from '../../core/models/workspace-info';

export class PackageManagerEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const packageManager =
      (await _detectFromPackageJson(this._tree)) ??
      (await _detectFromLockFiles(this._tree));

    if (packageManager === undefined) {
      return workspaceInfo;
    }

    return workspaceInfo.merge({ packageManager });
  }
}

async function _detectFromPackageJson(
  tree: ReadonlyTree,
): Promise<PackageManager | undefined> {
  const packageJson = await tree.maybeReadJsonFile<PackageJson>(
    relativePath('package.json'),
  );

  if (packageJson?.packageManager === undefined) {
    return undefined;
  }

  const name = packageJson.packageManager.split('@')[0];
  return _isPackageManager(name) ? name : undefined;
}

async function _detectFromLockFiles(
  tree: ReadonlyTree,
): Promise<PackageManager | undefined> {
  if ((await tree.maybeReadFile(relativePath('pnpm-lock.yaml'))) !== null) {
    return 'pnpm';
  }

  if ((await tree.maybeReadFile(relativePath('yarn.lock'))) !== null) {
    return 'yarn';
  }

  if ((await tree.maybeReadFile(relativePath('package-lock.json'))) !== null) {
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
