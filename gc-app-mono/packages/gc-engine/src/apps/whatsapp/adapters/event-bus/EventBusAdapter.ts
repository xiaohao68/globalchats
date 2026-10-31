import type {
  IEventBus,
  AllDomainEvents,
  EventTypeMap,
} from "../../core/ports/outbound/IEventBus";

type EventHandler<T> = (event: T) => void;

/**
 * 事件总线适配器
 * 实现简单的发布/订阅模式
 */
export class EventBusAdapter implements IEventBus {
  private handlers = new Map<string, Set<EventHandler<AllDomainEvents>>>();

  emit<T extends AllDomainEvents>(event: T): void {
    const eventHandlers = this.handlers.get(event.type);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
  }

  on<K extends keyof EventTypeMap>(
    eventType: K,
    handler: (event: EventTypeMap[K]) => void,
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const eventHandlers = this.handlers.get(eventType)!;
    eventHandlers.add(handler as EventHandler<AllDomainEvents>);

    return () => {
      eventHandlers.delete(handler as EventHandler<AllDomainEvents>);
    };
  }

  once<K extends keyof EventTypeMap>(
    eventType: K,
    handler: (event: EventTypeMap[K]) => void,
  ): () => void {
    const wrappedHandler = (event: EventTypeMap[K]) => {
      cleanup();
      handler(event);
    };

    const cleanup = this.on(eventType, wrappedHandler);
    return cleanup;
  }

  clear(): void {
    this.handlers.clear();
  }
}
