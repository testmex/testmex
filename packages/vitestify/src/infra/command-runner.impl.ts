import { spawn } from 'cross-spawn';
import type {
  Command,
  CommandRunner,
  CommandRunOptions,
} from '../core/ports/command-runner';

/**
 * We use `cross-spawn` instead of `node:child_process` because on Windows,
 * executables such as `npx` are `.cmd` scripts (i.e. `npx.cmd`) that can't be
 * spawned without a shell, and `cross-spawn` takes care of resolving them and
 * escaping arguments for `cmd.exe`.
 */
export class CommandRunnerImpl implements CommandRunner {
  async run(
    command: Command,
    options: CommandRunOptions = {},
  ): Promise<string> {
    const [file, ...args] = command;

    return new Promise((resolve, reject) => {
      const child = spawn(file, args, {
        cwd: options.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
        stderr += chunk;
      });

      child.on('error', reject);
      child.on('close', (exitCode) => {
        /* Ignoring the exit code is useful when we want to catch the output
         * of vitest --reporter=json even when a test fails. */
        if (exitCode === 0 || options.ignoreExitCode === true) {
          resolve(stdout);
          return;
        }

        reject(new CommandFailedError({ command, exitCode, stdout, stderr }));
      });
    });
  }
}

export class CommandFailedError extends Error {
  readonly command: Command;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor({
    command,
    exitCode,
    stdout,
    stderr,
  }: {
    command: Command;
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }) {
    super(
      `Command failed with exit code ${exitCode}: ${command.join(' ')}\n${stderr}`,
    );
    this.name = 'CommandFailedError';
    this.command = command;
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}
