import './map';
import { objectFactory } from './object';
import { registerClass } from './registerClass';
import './set';

registerClass(Object, objectFactory);
registerClass(Array, objectFactory);
