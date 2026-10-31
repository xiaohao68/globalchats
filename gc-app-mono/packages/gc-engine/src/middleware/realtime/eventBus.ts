import mitt from "mitt";
import type { MiddlewareMessage } from "../types.ts";

type Events = {
  newMessage: MiddlewareMessage;
};

export class RealtimeEventBus {
  readonly #emitter = mitt<Events>();

  onNewMessage(handler: (message: MiddlewareMessage) => void): () => void {
    this.#emitter.on("newMessage", handler);
    return () => {
      this.#emitter.off("newMessage", handler);
    };
  }

  publishNewMessages(messages: MiddlewareMessage[]): void {
    messages.forEach((message) => {
      this.#emitter.emit("newMessage", message);
    });
  }

  clear(): void {
    this.#emitter.all.clear();
  }
}
