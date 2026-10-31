import { Noop, UnlistenerFn } from "@gc/utils";
import { isEmpty, isEqual } from "lodash-es";
import { AbstractLifeCycle } from "../life-cycle";
import { fastEventLoop, fastEventLoopQueue } from "../event-loop";

// 创建一个函数来应用增强并返回清理函数
class HkLocalStorage implements AbstractLifeCycle {
  #listeners: Record<string, Noop[]> = {};
  #cachedPreState: Record<string, string> = {};

  // constructor() {
  //   this.mount();
  // }

  mount() {
    fastEventLoopQueue.pushBack(() => {
      const keys = Object.keys(this.#listeners);
      if (isEmpty(keys)) {
        return;
      }
      keys.forEach((key) => {
        const nowState = localStorage.getItem(key)!;
        const oldState = this.#cachedPreState[key];
        if (isEqual(nowState, oldState)) {
          return;
        }
        this.#cachedPreState[key] = nowState;
        this.#listeners[key]?.forEach((listener) => listener());
      });
    });
    fastEventLoop();
  }

  destroy() {
    // clearInterval(this.#interval);
  }

  onLocalStorageChange(key: string, listener: Noop): UnlistenerFn {
    if (isEmpty(this.#listeners[key])) {
      this.#listeners[key] = [];
    }
    this.#listeners[key]!.push(listener);

    return () => {
      const index = this.#listeners[key]?.indexOf(listener);
      if (index && index > -1) {
        this.#listeners[key]?.splice(index, 1);
      }
    };
  }
}

export const hkLocalStorage = new HkLocalStorage();
