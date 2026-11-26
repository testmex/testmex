import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { relativePath } from '../core/models/relative-path';
import { CommandFailedError, CommandRunnerImpl } from './command-runner.impl';

describe(CommandRunnerImpl, () => {
  it('returns stdout', async () => {
    const { runner } = setUp();

    const output = await runner.run([
      'node',
      '-e',
      'process.stdout.write("hello")',
    ]);

    expect(output).toBe('hello');
  });

  /* Regression test for https://github.com/testmex/testmex/issues/25
   * where `npx` could not be spawned on Windows because it is `npx.cmd`. */
  it('runs npx', async () => {
    const { runner } = setUp();

    const output = await runner.run(['npx', '--version']);

    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('passes arguments with spaces and special characters as is', async () => {
    const { runner } = setUp();

    const output = await runner.run([
      'node',
      '-e',
      'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
      'my config.mts',
      'a&b|c',
      'say "hi"',
      '100%',
    ]);

    expect(JSON.parse(output)).toEqual([
      'my config.mts',
      'a&b|c',
      'say "hi"',
      '100%',
    ]);
  });

  it('runs command in cwd', async () => {
    const { runner, createTempDir } = setUp();
    const dir = await createTempDir();
    await writeFile(join(dir, 'marker.txt'), 'found');

    const output = await runner.run(
      [
        'node',
        '-e',
        'process.stdout.write(require("fs").readFileSync("marker.txt", "utf8"))',
      ],
      { cwd: relativePath(relative(process.cwd(), dir)) },
    );

    expect(output).toBe('found');
  });

  it('rejects with stdout and stderr when command fails', async () => {
    const { runner } = setUp();

    const promise = runner.run([
      'node',
      '-e',
      'process.stdout.write("out"); process.stderr.write("err"); process.exit(3)',
    ]);

    await expect(promise).rejects.toThrow(CommandFailedError);
    await expect(promise).rejects.toMatchObject({
      exitCode: 3,
      stdout: 'out',
      stderr: 'err',
    });
  });

  it('returns stdout when command fails and exit code is ignored', async () => {
    const { runner } = setUp();

    const output = await runner.run(
      ['node', '-e', 'process.stdout.write("partial"); process.exit(1)'],
      { ignoreExitCode: true },
    );

    expect(output).toBe('partial');
  });

  it('rejects when executable does not exist', async () => {
    const { runner } = setUp();

    await expect(
      runner.run(['this-executable-does-not-exist']),
    ).rejects.toThrow();
  });
});

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function setUp() {
  return {
    runner: new CommandRunnerImpl(),
    async createTempDir() {
      const dir = await mkdtemp(join(tmpdir(), 'vitestify-command-runner-'));
      tempDirs.push(dir);
      return dir;
    },
  };
}
