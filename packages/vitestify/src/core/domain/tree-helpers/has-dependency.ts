import { relativePath } from '../../models/relative-path';
import type { ReadonlyTree } from '../tree';

export async function hasDependency(
  tree: ReadonlyTree,
  packageName: string,
): Promise<boolean> {
  const packageJson = await tree.maybeReadJsonFile<PackageJson>(
    relativePath('package.json'),
  );

  if (packageJson == null) {
    return false;
  }

  return (
    packageName in (packageJson.dependencies ?? {}) ||
    packageName in (packageJson.devDependencies ?? {})
  );
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
