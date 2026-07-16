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
      createStep: (args) => this._createStep(args),
      done: () => {
        outro(`${title} finished`);
      },
    };
  }

  private _createStep(args: StepArgs): Step {
    const clackSpinner = spinner();
    let started = false;
    let stepMessage: string | undefined = undefined;
    const subStepMessages: string[] = [];

    return {
      createSubStep: (message: string): SubStep => {
        const index = subStepMessages.length;
        subStepMessages.push(message);
        _render();

        return {
          updateMessage: (next: string) => {
            subStepMessages[index] = next;
            _render();
          },
        };
      },
      updateMessage: (message: string) => {
        stepMessage = message;
        _render();
      },
      done: (message: string) => {
        if (!started) {
          _render();
        }

        clackSpinner.stop(
          _renderStepMessage({
            ...args,
            message,
          }),
        );
      },
      error: (message: string) => {
        if (!started) {
          return;
        }

        clackSpinner.error(
          _renderStepMessage({
            ...args,
            message,
          }),
        );
      },
    };

    function _render() {
      const display = _renderStepMessage({
        ...args,
        message: stepMessage,
        subStepMessages,
      });

      if (!started) {
        clackSpinner.start(display);
        started = true;
        return;
      }

      clackSpinner.message(display);
    }
  }
}

/**
 * Formats the text shown for a progress step in the terminal.
 *
 * Builds a single-line step label (`name · message`, or `[n/m] name · message`
 * when numbering is provided) and appends sub-step lines prefixed with `| `.
 */
export function _renderStepMessage({
  stepNumber,
  stepCount,
  name,
  message,
  subStepMessages = [],
}: {
  name: string;
  message?: string;
  subStepMessages?: readonly string[];
  stepNumber?: number;
  stepCount?: number;
}): string {
  let formatted = '';

  if (stepNumber !== undefined && stepCount !== undefined) {
    formatted = `[${stepNumber}/${stepCount}] `;
  }

  formatted += name;

  if (message !== undefined) {
    formatted += ` · ${message}`;
  }

  if (subStepMessages.length === 0) {
    return formatted;
  }

  return `${formatted}\n${subStepMessages.map((m) => `| ${m}`).join('\n')}`;
}
