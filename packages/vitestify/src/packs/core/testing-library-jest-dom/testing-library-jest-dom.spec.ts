import { describe, it } from 'vitest';

describe('testing-library-jest-dom', () => {
  it.todo(
    'rewrites @testing-library/jest-dom side-effect import in setup files',
    () => {
      // arrange a setup file with `import '@testing-library/jest-dom';`
      // apply testingLibraryJestDomTransform
      // assert file contains:
      // if (!process.env.VITEST) {
      //   require('@testing-library/jest-dom')
      // }
    },
  );
});
