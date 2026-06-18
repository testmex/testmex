import { describe, it } from 'vitest';
import { Analyzer } from './analyzer';

describe(Analyzer.name, () => {
  it.todo('runs heuristics and passes through context', () => {
    // Arrange: a Workspace with one project and one file; one dummy Heuristic that returns a file-scoped result and one that returns a project-scoped result; one that returns nothing.
    // Act: run analyzer.
    // Assert: returns exactly two findings, each with project populated and the file-scoped finding's file populated.
  });
});
