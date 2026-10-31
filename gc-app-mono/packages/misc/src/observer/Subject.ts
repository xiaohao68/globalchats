import { Observer } from "./Observer";

export class Subject<T> {
  observerList: Observer<T>[] = [];

  attach(observer: Observer<T>) {
    this.observerList.push(observer);
  }
  detach(observer: Observer<T>) {
    const index = this.observerList.findIndex((o) => o === observer);
    if (index !== -1) {
      delete this.observerList[index];
    }
  }
  notify(message: T) {
    console.log("this.observerList", this.observerList);

    this.observerList.forEach((observer) => {
      observer?.update?.(message);
    });
  }
}
