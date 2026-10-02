export const messageOf = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : "Something went wrong. Please try again.";
