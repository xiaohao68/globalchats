import { describe, expect, it, vi } from "vitest";
import { Observer } from "../observer/Observer.ts";
import { Subject } from "../observer/Subject.ts";

describe("Observer", () => {
  it("calls callback when update is called", () => {
    const callback = vi.fn();
    const observer = new Observer(callback);

    observer.update("test message");

    expect(callback).toHaveBeenCalledWith("test message");
  });

  it("passes typed messages to callback", () => {
    interface Message {
      type: string;
      data: number;
    }
    const callback = vi.fn<[Message], void>();
    const observer = new Observer<Message>(callback);

    observer.update({ type: "test", data: 42 });

    expect(callback).toHaveBeenCalledWith({ type: "test", data: 42 });
  });
});

describe("Subject", () => {
  it("notifies all attached observers", () => {
    const subject = new Subject<string>();
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const observer1 = new Observer(callback1);
    const observer2 = new Observer(callback2);

    subject.attach(observer1);
    subject.attach(observer2);
    subject.notify("message");

    expect(callback1).toHaveBeenCalledWith("message");
    expect(callback2).toHaveBeenCalledWith("message");
  });

  it("does not notify detached observers", () => {
    const subject = new Subject<string>();
    const callback = vi.fn();
    const observer = new Observer(callback);

    subject.attach(observer);
    subject.detach(observer);
    subject.notify("message");

    expect(callback).not.toHaveBeenCalled();
  });

  it("handles detaching non-existent observer gracefully", () => {
    const subject = new Subject<string>();
    const observer = new Observer(vi.fn());

    expect(() => subject.detach(observer)).not.toThrow();
  });

  it("starts with empty observer list", () => {
    const subject = new Subject<string>();
    expect(subject.observerList).toEqual([]);
  });
});
