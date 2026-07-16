import type { RelativePath } from '../models/relative-path';

export type Command = readonly string[];

export interface CommandRunOptions {
  cwd?: RelativePath;
  ignoreExitCode?: boolean;
}

export interface CommandRunner {
  run(command: Command, options?: CommandRunOptions): Promise<string>;
}
