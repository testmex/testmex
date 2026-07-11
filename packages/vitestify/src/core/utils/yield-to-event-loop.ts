/**
 * Yields control to the event loop.
 *
 * This is useful to give the opportunity to tools such as `clack` to intercept CTRL+C.
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
