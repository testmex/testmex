import type { ProgressReporter, ProgressSpinner } from './progress-reporter';

export class ProgressReporterFake implements ProgressReporter {
  private readonly _messages: string[] = [];

  createSpinner(): ProgressSpinner {
    return {
      message: (message: string) => {
        this._messages.push(message);
      },
      done: (message?: string) => {
        if (message !== undefined) {
          this._messages.push(message);
        }
      },
      error: (message: string) => {
        this._messages.push(message);
        throw new Error('🚧 work in progress');
      },
    };
  }

  message(): string | undefined {
    return this._messages.at(-1);
  }

  messages(): readonly string[] {
    return this._messages;
  }
}
