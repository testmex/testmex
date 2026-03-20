import { describe, it } from 'vitest';
import { Scanner } from './scanner.js';

describe(Scanner.name, () => {
  it.todo('detects angular cli project', () => {
    // Arrange: create a temp workspace with `angular.json` and a `jest.config.ts`.
    // Act: run scanner on the workspace path.
    // Assert: returns project type `angular-cli` with the jest config path.
  });

  it.todo('detects nx project', () => {
    // Arrange: create a temp workspace with `nx.json`, `project.json`, and a `jest.config.ts`.
    // Act: run scanner on the workspace path.
    // Assert: returns project type `nx` with the jest config path.
  });
});
