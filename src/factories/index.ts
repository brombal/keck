import './map';
import { objectFactory } from './object';
import { registerObservableClass } from './registerObservableClass';
import './set';

// Detect multiple keck instances in the same realm and warn. Each copy increments
// this counter; anything above 1 means the user has duplicate installations.
const INSTANCE_KEY = Symbol.for('keck:instanceCount');
(globalThis as any)[INSTANCE_KEY] = ((globalThis as any)[INSTANCE_KEY] ?? 0) + 1;
if ((globalThis as any)[INSTANCE_KEY] > 1) {
  console.warn(
    '[Keck] Multiple instances of keck are loaded in the same JavaScript environment. ' +
      'This usually means a dependency bundles a different version of keck than your project.' +
      'Ensure all packages share the same keck version to silence this warning.',
  );
}

registerObservableClass(Object, objectFactory);
registerObservableClass(Array, objectFactory);
