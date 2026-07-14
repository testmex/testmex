import { spinner } from '@clack/prompts';
import {
  NO_OP_STEP,
  type ProgressReporter,
  type Step,
  type StepArgs,
} from '../core/ports/progress-reporter';

export class TerminalProgressReporter implements ProgressReporter {
  createStep(args: StepArgs): Step {
    if (!process.stdout.isTTY) {
      return NO_OP_STEP;
    }

    const clackSpinner = spinner();
    let started = false;
    const format = (body: string) => _formatStepMessage(args, body);

    return {
      message: (body: string) => {
        const message = format(body);
        if (!started) {
          clackSpinner.start(message);
          started = true;
          return;
        }

        clackSpinner.message(message);
      },
      done: (body?: string) => {
        if (!started) {
          return;
        }

        clackSpinner.stop(body === undefined ? undefined : format(body));
      },
      error: (body: string) => {
        if (!started) {
          return;
        }

        clackSpinner.error(format(body));
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
