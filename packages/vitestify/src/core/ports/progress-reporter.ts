export interface ProgressSpinner {
  message(message: string): void;
  done(message?: string): void;
}

export interface ProgressReporter {
  createSpinner(): ProgressSpinner;
}
