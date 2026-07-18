import { describe, expect, it } from 'vitest';
import { _renderStepMessage } from './legacy-terminal-progress-reporter';

describe(_renderStepMessage, () => {
  it('formats step without message', () => {
    expect(
      _renderStepMessage({
        name: 'scan',
      }),
    ).toBe('scan');
  });

  it('formats step message without step number', () => {
    expect(
      _renderStepMessage({
        name: 'scan',
        message: 'reading files',
      }),
    ).toBe('scan · reading files');
  });

  it('formats step message with step number and count', () => {
    expect(
      _renderStepMessage({
        name: 'scan',
        stepNumber: 2,
        stepCount: 5,
        message: 'reading files',
      }),
    ).toBe('[2/5] scan · reading files');
  });

  it('appends sub-step messages on separate lines', () => {
    expect(
      _renderStepMessage({
        name: 'transform',
        message: 'processing',
        subStepMessages: ['src/app.ts'],
      }),
    ).toBe('transform · processing\n| src/app.ts');
  });

  it('appends multiple sub-step messages', () => {
    expect(
      _renderStepMessage({
        name: 'transform',
        stepNumber: 3,
        stepCount: 5,
        message: 'processing',
        subStepMessages: ['src/app.ts', 'src/main.ts'],
      }),
    ).toBe(`\
[3/5] transform · processing
| src/app.ts
| src/main.ts`);
  });
});
