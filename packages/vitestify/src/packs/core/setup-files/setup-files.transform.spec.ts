import { describe, it } from 'vitest';

describe('setup-files', () => {
  it.todo('clones jest setup file with vitest- prefix', () => {
    // create workspace with jest setup file tagged jestSetup
    // run setupFilesTransform
    // assert vitest-{basename} exists with same content as the jest setup file
  });

  it.todo('does not overwrite existing vitest- prefixed clone', () => {
    // create workspace with jest setup file tagged jestSetup
    // create existing vitest- prefixed clone with different content
    // run setupFilesTransform
    // assert vitest- prefixed clone content is unchanged
  });
});
