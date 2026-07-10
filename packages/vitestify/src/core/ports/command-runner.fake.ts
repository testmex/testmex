import { CommandRunner } from './command-runner';

export class CommandRunnerFake implements CommandRunner {
  private readonly _responses = new Map<string, string>();

  configure(entries: Record<string, string>): void {
    this._responses.clear();
    for (const [command, output] of Object.entries(entries)) {
      this._responses.set(command, output);
    }
  }

  async run(args: readonly string[]): Promise<string> {
    const output = this._responses.get(args.join(' '));
    if (output === undefined) {
      throw new Error(
        `CommandRunnerFake: Unexpected command: ${JSON.stringify(args)}`,
      );
    }
    return output;
  }
}
