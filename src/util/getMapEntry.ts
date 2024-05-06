export function getMapEntry<TKey, TValue, TCreate extends TValue>(
  map: { get(key: TKey): TValue | undefined; set(key: TKey, value: TValue): void },
  key: TKey,
  create: () => TCreate,
  meta?: { created?: boolean },
): TValue {
  let value = map.get(key as any);
  if (!value) {
    value = create();
    map.set(key as any, value);
    if (meta) meta.created = true;
  }
  return value;
}