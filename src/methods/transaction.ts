import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observable } from 'keck/core/RootNode';

export function beginTransaction(observable: object): void {
  ObservableContext.getForObservable(observable as Observable).observer.beginTransaction();
}

export function commitTransaction(observable: object): void {
  ObservableContext.getForObservable(observable as Observable).observer.commitTransaction();
}

export function discardTransaction(observable: object): void {
  ObservableContext.getForObservable(observable as Observable).observer.discardTransaction();
}
