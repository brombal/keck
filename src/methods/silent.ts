export let silentMode = false;

/**
 * Use `silent` to execute a block of code without triggering any observer callbacks when modifications are made.
 * @param callback The block of code to execute.
 */
export function silent(callback: () => void) {
  silentMode = true;
  callback();
  silentMode = false;
}
