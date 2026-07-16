import type {
  Phase,
  ProgressReporter,
  Step,
  StepArgs,
  SubStep,
} from './progress-reporter';

export class ProgressReporterFake implements ProgressReporter {
  private readonly _errors: string[] = [];
  private readonly _messages: string[] = [];

  createPhase(_title: string): Phase {
    return {
      createStep: (args) => this._createStep(args),
      done: () => undefined,
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

  private _createStep(args: StepArgs): Step {
    return {
      createSubStep: (message: string): SubStep => {
        this._messages.push(_formatStepMessage(args, message));
        return {
          updateMessage: (body: string) => {
            this._messages.push(_formatStepMessage(args, body));
          },
        };
      },
      updateMessage: (body: string) => {
        this._messages.push(_formatStepMessage(args, body));
      },
      done: (body: string) => {
        this._messages.push(_formatStepMessage(args, body));
      },
      error: (body: string) => {
        this._errors.push(_formatStepMessage(args, body));
      },
    };
  }
}

function _formatStepMessage(args: StepArgs, body: string): string {
  const prefix =
    'stepNumber' in args
      ? `[${args.stepNumber}/${args.stepCount}] ${args.name} · `
      : `${args.name} · `;
  return `${prefix}${body}`;
}
