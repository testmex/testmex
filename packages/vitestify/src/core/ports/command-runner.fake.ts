import type { RelativePath } from '../models/relative-path';
import type {
  Command,
  CommandRunner,
  CommandRunOptions,
} from './command-runner';

export type ExpectedCommand = {
  command: Command;
  cwd?: RelativePath;
} & ({ output: string } | { error: Error });

export interface ExecutedCommand {
  command: Command;
  options?: CommandRunOptions;
}

export class CommandRunnerFake implements CommandRunner {
  private _expectedCommands: ExpectedCommand[] = [];
  private readonly _executedCommands: ExecutedCommand[] = [];

  configure(expectedCommands: ExpectedCommand[]): void {
    this._assertCommandsAreUnique(expectedCommands);

    this._expectedCommands = expectedCommands;
  }

  executedCommands(): readonly ExecutedCommand[] {
    return this._executedCommands;
  }

  async run(command: Command, options?: CommandRunOptions): Promise<string> {
    const expectedCommand = this._expectedCommands.find(
      (expected) =>
        expected.command.join(' ') === command.join(' ') &&
        expected.cwd === options?.cwd,
    );

    this._executedCommands.push({ command, options });

    if (expectedCommand === undefined) {
      throw new Error(
        `CommandRunnerFake: Unexpected command: ${JSON.stringify(command)}` +
          (options?.cwd === undefined ? '' : ` cwd:${options.cwd}`),
      );
    }

    if ('error' in expectedCommand) {
      throw expectedCommand.error;
    }

    return expectedCommand.output;
  }

  private _assertCommandsAreUnique(expectedCommands: ExpectedCommand[]): void {
    const uniqueCommands = new Set<string>(
      expectedCommands.map((expected) => JSON.stringify(expected)),
    );
    if (uniqueCommands.size !== expectedCommands.length) {
      throw new Error(
        `CommandRunnerFake: Duplicate command configuration: ${JSON.stringify(expectedCommands)}`,
      );
    }
  }
}
