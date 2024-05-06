export let silentMode = false;

export function silent(callback: () => void) {
  silentMode = true;
  callback();
  silentMode = false;
}
