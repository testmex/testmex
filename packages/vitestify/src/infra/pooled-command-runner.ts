import type { CommandRunner } from '../core/ports/command-runner';
import { CommandRunnerImpl } from './command-runner.impl';

export class PooledCommandRunner implements CommandRunner {
  private readonly _inner: CommandRunner;
  private readonly _maxConcurrent: number;
  private readonly _queue: Array<() => void> = [];
  private _running = 0;

  constructor(args: { inner?: CommandRunner; maxConcurrent?: number } = {}) {
    this._inner = args.inner ?? new CommandRunnerImpl();
    this._maxConcurrent = args.maxConcurrent ?? 10;
  }

  async run(args: readonly string[]): Promise<string> {
    await this._acquire();
    try {
      return await this._inner.run(args);
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
