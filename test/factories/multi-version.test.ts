import { vi } from 'vitest';

const REGISTRY_KEY = Symbol.for('keck:observableFactories');
const INSTANCE_KEY = Symbol.for('keck:instanceCount');

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('globalThis shared registry', () => {
  test('reuses existing Map from globalThis when already present', async () => {
    const existingMap = new Map();
    (globalThis as any)[REGISTRY_KEY] = existingMap;

    const { observableFactories } = await import('keck/factories/observableFactories');

    expect(observableFactories).toBe(existingMap);

    delete (globalThis as any)[REGISTRY_KEY];
  });
});

describe('multi-version warning', () => {
  test('warns when more than one keck instance is detected', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as any)[INSTANCE_KEY] = 1;

    await import('keck/factories/index');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Keck] Multiple instances'));

    delete (globalThis as any)[INSTANCE_KEY];
  });

  test('does not warn when only one instance is present', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    delete (globalThis as any)[INSTANCE_KEY];

    await import('keck/factories/index');

    expect(warnSpy).not.toHaveBeenCalled();

    delete (globalThis as any)[INSTANCE_KEY];
  });
});
