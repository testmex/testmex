export interface ProgressSpinner {
  update(message: string): void;
  done(message?: string): void;
}

export interface ProgressReporter {
  createSpinner(): ProgressSpinner;
}
