import type { CommandRunner } from '../core/ports/command-runner';
import { CommandRunnerPooled } from './command-runner-pooled';

describe(CommandRunnerPooled, () => {
  it('limits concurrent runs to maxConcurrent', async () => {
    const { commandRunner, inner } = setUp();

    Array.from({ length: 15 }, (_, index) =>
      commandRunner.run(['cmd', String(index)]),
    );

    await expect.poll(() => inner.getPendingCommandsCount()).toBe(10);
  });

  it('runs next commands when some complete', async () => {
    const { commandRunner, inner } = setUp();
    inner.configure({ autoRunFirstCommands: 12 });

    Array.from({ length: 15 }, (_, index) =>
      commandRunner.run(['cmd', String(index)]),
    );

    await expect.poll(() => inner.getPendingCommandsCount()).toBe(3);
    await expect.poll(() => inner.getExecutedCommandsCount()).toBe(12);
  });
});

function setUp() {
  const inner = new TrackingCommandRunner();
  return {
    inner,
    commandRunner: new CommandRunnerPooled({
      inner,
      maxConcurrent: 10,
    }),
  };
}

class TrackingCommandRunner implements CommandRunner {
  private _autoRunFirstCommands = 0;
  private _executedCommandsCount = 0;
  private _pendingCommandsCount = 0;
  async run(): Promise<string> {
    if (this._autoRunFirstCommands > 0) {
      this._autoRunFirstCommands--;
    } else {
      this._pendingCommandsCount++;
      await new Promise<void>(() => null);
    }

    this._executedCommandsCount++;

    return '';
  }

  configure({
    autoRunFirstCommands,
  }: { autoRunFirstCommands?: number } = {}): void {
    if (autoRunFirstCommands !== undefined) {
      this._autoRunFirstCommands = autoRunFirstCommands;
    }
  }

  getPendingCommandsCount(): number {
    return this._pendingCommandsCount;
  }

  getExecutedCommandsCount(): number {
    return this._executedCommandsCount;
  }
}
