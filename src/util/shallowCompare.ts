/**
 * Compares two objects for shallow equality. This is provided as a convenience utility for the k.derive()
 * method.
 *
 * @param a The value to compare
 * @param b The value to compare against
 */
export function shallowCompare<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if ((a as any)[key] !== (b as any)[key]) return false;
  }
  return true;
}
