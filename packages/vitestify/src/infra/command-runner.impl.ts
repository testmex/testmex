import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Command, CommandRunner } from '../core/ports/command-runner';

export class CommandRunnerImpl implements CommandRunner {
  async run(command: Command): Promise<string> {
    const execFileAsync = promisify(execFile);
    const [file, ...commandArgs] = command;

    const { stdout } = await execFileAsync(file, commandArgs, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    return stdout;
  }
}
