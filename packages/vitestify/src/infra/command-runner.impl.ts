import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CommandRunner } from '../core/ports/command-runner';

export class CommandRunnerImpl implements CommandRunner {
  async run(args: readonly string[]): Promise<string> {
    const execFileAsync = promisify(execFile);
    const [file, ...commandArgs] = args;

    const { stdout } = await execFileAsync(file, commandArgs, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    return stdout;
  }
}
