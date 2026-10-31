export interface QueueOptions {
  maxSize: number;
  flushInterval: number;
  flushThreshold: number;
}

const DEFAULT_OPTIONS: QueueOptions = {
  maxSize: 1000,
  flushInterval: 1000,
  flushThreshold: 50,
};

/**
 * 内存消息队列
 * 支持自动刷新和阈值触发
 */
export class MessageQueue<T> {
  private queue: T[] = [];
  private options: QueueOptions;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private onFlushCallback: ((items: T[]) => Promise<void>) | null = null;
  private isFlushing = false;

  constructor(options?: Partial<QueueOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startAutoFlush();
  }

  enqueue(item: T): void {
    if (this.queue.length >= this.options.maxSize) {
      console.warn(`[MessageQueue] Queue full (${this.options.maxSize}), dropping oldest item`);
      this.queue.shift();
    }
    this.queue.push(item);
    console.log(`[MessageQueue] Enqueued item, queue size: ${this.queue.length}`);

    if (this.queue.length >= this.options.flushThreshold) {
      console.log(`[MessageQueue] Threshold reached (${this.queue.length}/${this.options.flushThreshold}), triggering flush`);
      void this.flush();
    }
  }

  dequeue(): T | undefined {
    return this.queue.shift();
  }

  peek(): T | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }

  onFlush(callback: (items: T[]) => Promise<void>): void {
    this.onFlushCallback = callback;
  }

  async flush(): Promise<void> {
    if (this.isEmpty() || !this.onFlushCallback || this.isFlushing) {
      return;
    }

    this.isFlushing = true;
    const items = [...this.queue];
    this.queue = [];
    console.log(`[MessageQueue] Flushing ${items.length} items`);

    try {
      await this.onFlushCallback(items);
      console.log(`[MessageQueue] Flush completed: ${items.length} items`);
    } catch (error) {
      console.error(`[MessageQueue] Flush failed, re-enqueueing ${items.length} items:`, error);
      this.queue = [...items, ...this.queue];
      throw error;
    } finally {
      this.isFlushing = false;
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.options.flushInterval);
  }
}
