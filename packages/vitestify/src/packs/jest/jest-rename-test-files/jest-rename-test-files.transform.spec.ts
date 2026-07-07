import { describe, it } from 'vitest';

import { jestRenameTestFilesTransform } from './jest-rename-test-files.transform';

describe(jestRenameTestFilesTransform.name, () => {
  it.todo('renames jest tests ending in .spec.ts to .jest.cts', () => {
    // create workspace with apps/my-app/src/app.spec.ts with jest symbol in it
    // run jestRenameTestFilesTransform
    // assert apps/my-app/src/app.jest.cts exists with same content
    // assert apps/my-app/src/app.spec.ts no longer exists
  });

  it.todo('renames jest tests ending in .spec.tsx to .jest.tsx', () => {
    // create workspace with apps/my-app/src/app.spec.tsx with jest symbol in it
    // run jestRenameTestFilesTransform
    // assert apps/my-app/src/app.jest.tsx exists with same content
    // assert apps/my-app/src/app.spec.tsx no longer exists
  });

  it.todo('skips files that are not jest tests', () => {
    // create workspace with apps/my-app/src/app.ts without jest symbol in it
    // run jestRenameTestFilesTransform
    // assert apps/my-app/src/app.spec.ts still exists
  });
});
