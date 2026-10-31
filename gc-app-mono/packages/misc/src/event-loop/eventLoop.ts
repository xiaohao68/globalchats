import { LinkList } from "js-sdsl";
import { Noop, UnlistenerFn } from "@gc/utils";
import { addTimeSliceTask } from "../timeSliceTask.ts";
import { once } from "lodash-es";

const fastEventLoopDuration = 500;
const middleEventLoopDuration = 1_000;
const slowEventLoopDuration = 5_000;

export const fastEventLoopQueue = new LinkList<Noop>();
export const middleEventLoopQueue = new LinkList<Noop>();
export const slowEventLoopQueue = new LinkList<Noop>();

export const fastEventLoop = once((): UnlistenerFn => {
  const timer = setInterval(async () => {
    if (fastEventLoopQueue.empty()) {
      return;
    }

    fastEventLoopQueue.forEach((task) => {
      addTimeSliceTask(task);
    });
  }, fastEventLoopDuration);

  return () => {
    clearInterval(timer);
  };
});
export const middleEventLoop = once((): UnlistenerFn => {
  const timer = setInterval(async () => {
    if (middleEventLoopQueue.empty()) {
      return;
    }

    middleEventLoopQueue.forEach((task) => {
      addTimeSliceTask(task);
    });
  }, middleEventLoopDuration);

  return () => {
    clearInterval(timer);
  };
});
export const slowEventLoop = once((): UnlistenerFn => {
  const timer = setInterval(async () => {
    if (slowEventLoopQueue.empty()) {
      return;
    }

    slowEventLoopQueue.forEach((task) => {
      addTimeSliceTask(task);
    });
  }, slowEventLoopDuration);

  return () => {
    clearInterval(timer);
  };
});
