import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  Command,
  CommandRunner,
  CommandRunOptions,
} from '../core/ports/command-runner';

export class CommandRunnerImpl implements CommandRunner {
  async run(
    command: Command,
    options: CommandRunOptions = {},
  ): Promise<string> {
    const execFileAsync = promisify(execFile);
    const [file, ...commandArgs] = command;

    try {
      const { stdout } = await execFileAsync(file, commandArgs, {
        cwd: options.cwd,
        encoding: 'utf8',
        /* HACK: Fixes ERR_CHILD_PROCESS_STDIO_MAXBUFFER when running `nx add @nx/vitest` */
        maxBuffer: 1_000_000_000,
      });

      return stdout;
    } catch (error) {
      /* This is useful when we want to catch the output of vitest --reporter=json
       * even when a test fails. */
      if (
        options.ignoreExitCode === true &&
        error instanceof Error &&
        'stdout' in error &&
        typeof error.stdout === 'string'
      ) {
        return error.stdout;
      }

      throw error;
    }
  }
}
