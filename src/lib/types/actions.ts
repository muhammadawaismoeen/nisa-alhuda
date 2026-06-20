/**
 * Canonical Server Action return type used across the entire codebase.
 *
 * Every Server Action must return one of these two shapes — no `throw`,
 * no silent `null`, no ad-hoc return types. UI components can rely on
 * this contract without defensive casting.
 *
 * Usage:
 *   export async function myAction(): Promise<ActionResult> { ... }
 *   export async function myAction(): Promise<ActionResult<{ id: string }>> { ... }
 *
 * Checking the result:
 *   const result = await myAction();
 *   if (!result.success) { toast.error(result.error); return; }
 *   console.log(result.data); // typed as { id: string }
 */

export type ActionOk<T = undefined> = T extends undefined
  ? { success: true }
  : { success: true; data: T };

export type ActionFail = { success: false; error: string };

export type ActionResult<T = undefined> = ActionOk<T> | ActionFail;

/** Narrow a result to its success branch. */
export function isActionOk<T>(
  result: ActionResult<T>
): result is ActionOk<T> {
  return result.success === true;
}

/** Build a success result — typed inference keeps callers clean. */
export function ok(): ActionOk<undefined>;
export function ok<T>(data: T): ActionOk<T>;
export function ok<T>(data?: T): ActionOk<T> | ActionOk<undefined> {
  return data !== undefined
    ? ({ success: true, data } as ActionOk<T>)
    : { success: true };
}

/** Build a failure result. */
export function fail(error: string): ActionFail {
  return { success: false, error };
}
