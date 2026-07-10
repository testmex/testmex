export type Command = readonly string[];

export type CommandResponse = readonly [command: Command, output: string];

export interface CommandRunner {
  run(command: Command): Promise<string>;
}
