export interface CommandRunner {
  run(args: readonly string[]): Promise<string>;
}
