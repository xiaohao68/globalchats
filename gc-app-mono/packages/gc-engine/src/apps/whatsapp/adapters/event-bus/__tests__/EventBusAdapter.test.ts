import { describe, it, expect, vi } from "vitest";
import { EventBusAdapter } from "../EventBusAdapter";
import type { AuthLoginStatusEvent, MessageNewEvent } from "../../../core/ports/outbound/IEventBus";

describe("EventBusAdapter", () => {
  describe("emit and on", () => {
    it("should call handler when event is emitted", () => {
      const eventBus = new EventBusAdapter();
      const handler = vi.fn();

      eventBus.on("auth:login_status", handler);

      const event: AuthLoginStatusEvent = {
        type: "auth:login_status",
        payload: { isLoggedIn: true },
        timestamp: Date.now(),
      };
      eventBus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should not call handler for different event types", () => {
      const eventBus = new EventBusAdapter();
      const handler = vi.fn();

      eventBus.on("auth:login_status", handler);

      const event: MessageNewEvent = {
        type: "message:new",
        payload: {
          message: {
            id: { _serialized: "msg1", id: "msg1", remote: "chat1", fromMe: false },
            t: Date.now() / 1000,
            body: "Hello",
            type: "text",
            from: "sender1",
            to: "receiver1",
            isNewMsg: true,
            ack: 0,
            viewed: false,
          },
        },
        timestamp: Date.now(),
      };
      eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should support multiple handlers for same event", () => {
      const eventBus = new EventBusAdapter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on("auth:login_status", handler1);
      eventBus.on("auth:login_status", handler2);

      const event: AuthLoginStatusEvent = {
        type: "auth:login_status",
        payload: { isLoggedIn: true },
        timestamp: Date.now(),
      };
      eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it("should return cleanup function that removes handler", () => {
      const eventBus = new EventBusAdapter();
      const handler = vi.fn();

      const cleanup = eventBus.on("auth:login_status", handler);

      const event: AuthLoginStatusEvent = {
        type: "auth:login_status",
        payload: { isLoggedIn: true },
        timestamp: Date.now(),
      };

      eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();

      eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("once", () => {
    it("should call handler only once", () => {
      const eventBus = new EventBusAdapter();
      const handler = vi.fn();

      eventBus.once("auth:login_status", handler);

      const event: AuthLoginStatusEvent = {
        type: "auth:login_status",
        payload: { isLoggedIn: true },
        timestamp: Date.now(),
      };

      eventBus.emit(event);
      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("clear", () => {
    it("should remove all handlers", () => {
      const eventBus = new EventBusAdapter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on("auth:login_status", handler1);
      eventBus.on("auth:logout", handler2);

      eventBus.clear();

      const event: AuthLoginStatusEvent = {
        type: "auth:login_status",
        payload: { isLoggedIn: true },
        timestamp: Date.now(),
      };
      eventBus.emit(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should catch errors in handlers and continue", () => {
      const eventBus = new EventBusAdapter();
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error("Handler error");
      });
      const normalHandler = vi.fn();

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      eventBus.on("auth:login_status", errorHandler);
      eventBus.on("auth:login_status", normalHandler);

      const event: AuthLoginStatusEvent = {
        type: "auth:login_status",
        payload: { isLoggedIn: true },
        timestamp: Date.now(),
      };
      eventBus.emit(event);

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
