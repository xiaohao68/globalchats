import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageQueue } from "../MessageQueue";

describe("MessageQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("enqueue", () => {
    it("should add items to the queue", () => {
      const queue = new MessageQueue<string>();
      queue.enqueue("item1");
      queue.enqueue("item2");
      expect(queue.size()).toBe(2);
      queue.destroy();
    });

    it("should respect maxSize limit", () => {
      const queue = new MessageQueue<string>({ maxSize: 2 });
      queue.enqueue("item1");
      queue.enqueue("item2");
      queue.enqueue("item3");
      expect(queue.size()).toBe(2);
      queue.destroy();
    });
  });

  describe("flush", () => {
    it("should call onFlush callback with all items", async () => {
      const flushCallback = vi.fn();
      const queue = new MessageQueue<string>();
      queue.onFlush(flushCallback);

      queue.enqueue("item1");
      queue.enqueue("item2");
      await queue.flush();

      expect(flushCallback).toHaveBeenCalledWith(["item1", "item2"]);
      expect(queue.size()).toBe(0);
      queue.destroy();
    });

    it("should not call onFlush if queue is empty", async () => {
      const flushCallback = vi.fn();
      const queue = new MessageQueue<string>();
      queue.onFlush(flushCallback);

      await queue.flush();

      expect(flushCallback).not.toHaveBeenCalled();
      queue.destroy();
    });
  });

  describe("auto flush", () => {
    it("should auto flush after flushInterval", async () => {
      const flushCallback = vi.fn().mockResolvedValue(undefined);
      const queue = new MessageQueue<string>({ flushInterval: 1000 });
      queue.onFlush(flushCallback);

      queue.enqueue("item1");

      vi.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(flushCallback).toHaveBeenCalledWith(["item1"]);
      queue.destroy();
    });

    it("should auto flush when threshold is reached", async () => {
      const flushCallback = vi.fn().mockResolvedValue(undefined);
      const queue = new MessageQueue<string>({
        flushThreshold: 2,
        flushInterval: 10000,
      });
      queue.onFlush(flushCallback);

      queue.enqueue("item1");
      expect(flushCallback).not.toHaveBeenCalled();

      queue.enqueue("item2");
      await Promise.resolve();

      expect(flushCallback).toHaveBeenCalledWith(["item1", "item2"]);
      queue.destroy();
    });
  });

  describe("destroy", () => {
    it("should stop the auto-flush timer", () => {
      const queue = new MessageQueue<string>();
      queue.enqueue("item1");
      queue.destroy();
      // destroy stops the timer but doesn't clear the queue
      expect(queue.size()).toBe(1);
    });

    it("should allow clearing queue before destroy", () => {
      const queue = new MessageQueue<string>();
      queue.enqueue("item1");
      queue.clear();
      queue.destroy();
      expect(queue.size()).toBe(0);
    });
  });
});
