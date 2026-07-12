import type { Command, CommandRunner } from './command-runner';

export type CommandRunnerResult =
  | { output: string }
  | { error: Error };

export class CommandRunnerFake implements CommandRunner {
  private readonly _responses = new Map<string, CommandRunnerResult>();
  private readonly _executedCommands: Command[] = [];

  configure(entries: Record<string, CommandRunnerResult>): void {
    this._responses.clear();
    this._executedCommands.length = 0;
    for (const [command, result] of Object.entries(entries)) {
      this._responses.set(command, result);
    }
  }

  executedCommands(): readonly Command[] {
    return this._executedCommands;
  }

  async run(args: readonly string[]): Promise<string> {
    this._executedCommands.push(args);
    const result = this._responses.get(args.join(' '));
    if (result === undefined) {
      throw new Error(
        `CommandRunnerFake: Unexpected command: ${JSON.stringify(args)}`,
      );
    }
    if ('error' in result) {
      throw result.error;
    }
    return result.output;
  }
}
