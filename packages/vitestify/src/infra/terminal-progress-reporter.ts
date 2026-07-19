import { intro, outro, spinner } from '@clack/prompts';
import type { ProgressReporter } from '../core/ports/progress-reporter';
import type { ProgressSnapshot } from '../core/models/progress-tracker';
import {
  TerminalProgressEngine,
  type TerminalProgressInstruction,
} from './terminal-progress-engine';

export class TerminalProgressReporter implements ProgressReporter {
  private readonly _engine = new TerminalProgressEngine();
  private _previous: ProgressSnapshot | null = null;
  private _activeSpinner: ReturnType<typeof spinner> | undefined;

  notify(snapshot: ProgressSnapshot): void {
    if (!process.stdout.isTTY) {
      this._previous = snapshot;
      return;
    }

    const instructions = this._engine.computeInstructions(
      this._previous,
      snapshot,
    );

    for (const instruction of instructions) {
      this._executeInstruction(instruction);
    }

    this._previous = snapshot;
  }

  private _executeInstruction(instruction: TerminalProgressInstruction): void {
    switch (instruction.kind) {
      case 'intro':
        intro(instruction.message);
        break;
      case 'outro':
        outro(instruction.message);
        break;
      case 'spinnerStart':
        this._activeSpinner = spinner();
        this._activeSpinner.start(instruction.message);
        break;
      case 'spinnerMessage':
        this._activeSpinner?.message(instruction.message);
        break;
      case 'spinnerStop':
        this._activeSpinner?.stop(instruction.message);
        this._activeSpinner = undefined;
        break;
      case 'spinnerError':
        this._activeSpinner?.error(instruction.message);
        this._activeSpinner = undefined;
        break;
    }
  }
}
