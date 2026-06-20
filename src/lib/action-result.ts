/**
 * Standard return type for every Server Action in this codebase.
 *
 * Why: previously each action returned its own ad-hoc shape
 * ({ success: boolean; error?: string } with optional data bolted on).
 * That made UI components guess whether the action succeeded, and errors
 * could silently disappear when callers only checked truthiness.
 *
 * Now every action returns one of two shapes — success always carries
 * `data`, failure always carries a string `error`. Callers get a
 * predictable contract and TypeScript narrows correctly.
 */

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Build a success result. Call with no argument for void actions. */
export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { success: true, data: data as T };
}

/** Build a failure result. */
export function fail(error: string): ActionResult<never> {
  return { success: false, error };
}
