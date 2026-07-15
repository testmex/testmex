import type { RelativePath } from '../models/relative-path';

export type Command = readonly string[];

export type CommandResponse = readonly [command: Command, output: string];

export interface CommandRunOptions {
  cwd?: RelativePath;
}

export interface CommandRunner {
  run(command: Command, options?: CommandRunOptions): Promise<string>;
}
