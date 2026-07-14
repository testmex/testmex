import type { ProgressReporter, Step, StepArgs } from './progress-reporter';

export class ProgressReporterFake implements ProgressReporter {
  private readonly _errors: string[] = [];
  private readonly _messages: string[] = [];

  createStep(args: StepArgs): Step {
    return {
      message: (body: string) => {
        this._messages.push(_formatStepMessage(args, body));
      },
      done: (body?: string) => {
        if (body !== undefined) {
          this._messages.push(_formatStepMessage(args, body));
        }
      },
      error: (body: string) => {
        this._errors.push(_formatStepMessage(args, body));
      },
    };
  }

  message(): string | undefined {
    return this._messages.at(-1);
  }

  messages(): readonly string[] {
    return this._messages;
  }

  errors(): readonly string[] {
    return this._errors;
  }
}

function _formatStepMessage(args: StepArgs, body: string): string {
  const prefix =
    'stepNumber' in args
      ? `[${args.stepNumber}/${args.stepCount}] ${args.name} · `
      : `${args.name} · `;
  return `${prefix}${body}`;
}
