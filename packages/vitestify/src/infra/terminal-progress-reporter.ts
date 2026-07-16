import { intro, outro, spinner } from '@clack/prompts';
import {
  NO_OP_PHASE,
  type Phase,
  type ProgressReporter,
  type Step,
  type StepArgs,
  type SubStep,
} from '../core/ports/progress-reporter';

export class TerminalProgressReporter implements ProgressReporter {
  createPhase(title: string): Phase {
    if (!process.stdout.isTTY) {
      return NO_OP_PHASE;
    }

    intro(`${title} started`);

    return {
      createStep: (args) => _createStep(args),
      done: () => {
        outro(`${title} finished`);
      },
    };
  }
}

function _createStep(args: StepArgs): Step {
  const clackSpinner = spinner();
  let started = false;
  let currentMessage = '';
  const subStepMessages: string[] = [];

  const format = (body: string) => _formatStepMessage(args, body);

  const render = () => {
    const formatted = format(currentMessage);
    const display =
      subStepMessages.length === 0
        ? formatted
        : `${formatted}\n${subStepMessages.map((m) => `| ${m}`).join('\n')}`;

    if (!started) {
      clackSpinner.start(display);
      started = true;
      return;
    }

    clackSpinner.message(display);
  };

  return {
    createSubStep: (message: string): SubStep => {
      const index = subStepMessages.length;
      subStepMessages.push(message);
      render();

      return {
        updateMessage: (next: string) => {
          subStepMessages[index] = next;
          render();
        },
      };
    },
    updateMessage: (message: string) => {
      currentMessage = message;
      render();
    },
    done: (message: string) => {
      if (!started) {
        return;
      }

      clackSpinner.stop(format(message));
    },
    error: (message: string) => {
      if (!started) {
        return;
      }

      clackSpinner.error(format(message));
    },
  };
}

function _formatStepMessage(args: StepArgs, body: string): string {
  const prefix =
    'stepNumber' in args
      ? `[${args.stepNumber}/${args.stepCount}] ${args.name} · `
      : `${args.name} · `;
  return `${prefix}${body}`;
}
