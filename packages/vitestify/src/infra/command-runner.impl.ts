import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Command, CommandRunner } from '../core/ports/command-runner';

export class CommandRunnerImpl implements CommandRunner {
  async run(command: Command): Promise<string> {
    const execFileAsync = promisify(execFile);
    const [file, ...commandArgs] = command;

    const { stdout } = await execFileAsync(file, commandArgs, {
      encoding: 'utf8',
      /* HACK: Fixes ERR_CHILD_PROCESS_STDIO_MAXBUFFER when running `nx add @nx/vitest` */
      maxBuffer: 1_000_000,
    });

    return stdout;
  }
}
