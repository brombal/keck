import './map';
import { objectFactory } from './object';
import { registerObservableClass } from './registerObservableClass';
import './set';

registerObservableClass(Object, objectFactory);
registerObservableClass(Array, objectFactory);
