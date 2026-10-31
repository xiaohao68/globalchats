export class Observer<T> {
  constructor(public callback: (message: T) => void) {}
  update(message: T) {
    console.log("update run ");
    this.callback(message);
  }
}
