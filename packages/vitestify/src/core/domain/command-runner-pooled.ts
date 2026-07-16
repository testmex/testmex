import { CommandRunnerImpl } from '../../infra/command-runner.impl';
import type {
  Command,
  CommandRunner,
  CommandRunOptions,
} from '../ports/command-runner';

export class CommandRunnerPooled implements CommandRunner {
  private readonly _inner: CommandRunner;
  private readonly _maxConcurrent: number;
  private readonly _queue: Array<() => void> = [];
  private _running = 0;

  constructor(args: { inner?: CommandRunner; maxConcurrent?: number } = {}) {
    this._inner = args.inner ?? new CommandRunnerImpl();
    this._maxConcurrent = args.maxConcurrent ?? 10;
  }

  async run(command: Command, options?: CommandRunOptions): Promise<string> {
    await this._acquire();
    try {
      return await this._inner.run(command, options);
    } finally {
      this._release();
    }
  }

  private _acquire(): Promise<void> {
    if (this._running < this._maxConcurrent) {
      this._running++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this._queue.push(resolve);
    });
  }

  private _release(): void {
    const resolveNext = this._queue.shift();
    if (resolveNext !== undefined) {
      resolveNext();
    } else {
      this._running--;
    }
  }
}
