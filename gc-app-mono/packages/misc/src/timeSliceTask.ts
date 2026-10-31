import { Queue } from "js-sdsl";
//-----------------------------------------------------------------------
// implement time slice work loop
//-----------------------------------------------------------------------
// TODO: TaskQueue 的数据结构和命名，考虑一定的扩展性，看是用数组还是链表、需要不要子任务。
// TODO: support Promised TaskQueue ?
import { Noop, Nullable } from "@gc/utils";
import { noop } from "lodash-es";

window.requestIdleCallback =
  window.requestIdleCallback ||
  function (handler) {
    let startTime = Date.now();
    return setTimeout(function () {
      handler({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50.0 - (Date.now() - startTime)),
      });
    }, 1);
  };

window.cancelIdleCallback =
  window.cancelIdleCallback ||
  ((id: number) => {
    clearTimeout(id);
  });

export class TimeSliceTask {
  exec: Noop;
  cancel: Noop;

  constructor(
    exec: TimeSliceTask["exec"],
    cancel: TimeSliceTask["cancel"] = noop,
  ) {
    this.exec = exec;
    this.cancel = cancel;
  }
}

const timeSliceTaskQueue = new Queue<TimeSliceTask>();
let subTask: Nullable<TimeSliceTask>;
let isProcessing = false; // 标记是否正在处理任务

const getFirstTask = () => {
  if (!timeSliceTaskQueue.empty()) {
    return timeSliceTaskQueue.pop();
  }
};

export const addTimeSliceTask = (
  exec: TimeSliceTask["exec"],
  cancel: TimeSliceTask["cancel"] = noop,
) => {
  timeSliceTaskQueue.push(new TimeSliceTask(exec, cancel));

  // 如果当前没有在处理任务，则自动开启处理
  if (!isProcessing) {
    flushTimeSliceTask();
  }
};

const MIN_REMAINING_TIME = 3;

const executeTask = async (
  subTask: TimeSliceTask,
): Promise<Nullable<TimeSliceTask>> => {
  try {
    await subTask.exec();
  } catch (error) {
    console.error("time slice task error", error);
  }
  return getFirstTask();
};

const workLoop = async (idleDeadline: IdleDeadline) => {
  if (!subTask) {
    subTask = getFirstTask();
  }

  while (subTask && idleDeadline.timeRemaining() > MIN_REMAINING_TIME) {
    // flush task
    subTask = await executeTask(subTask);
  }
};

const performTask = async (idleDeadline: IdleDeadline) => {
  isProcessing = true;

  try {
    // 1. 执行任务
    // 2. 判断是否还有任务，如果有任务在浏览器空闲时继续执行任务
    await workLoop(idleDeadline);

    if (subTask || !timeSliceTaskQueue.empty()) {
      requestIdleCallback(performTask);
    } else {
      // 没有更多任务时，标记为非处理状态
      isProcessing = false;
    }
  } catch (error) {
    console.error("Task processing failed:", error);
    isProcessing = false;
  }
};
// 异步时间切片方式清空任务
export const flushTimeSliceTask = () => {
  if (!isProcessing) {
    requestIdleCallback(performTask);
  }
};
export const cancelAllTimeSliceTask = () => {
  while (!timeSliceTaskQueue.empty()) {
    const task = timeSliceTaskQueue.pop()!;
    task.cancel();
  }
  subTask = null;
  isProcessing = false; // 重置处理状态
};

// 同步清空任务
export const flushSyncTimeSliceTask = () => {
  // TODO:
  while (!timeSliceTaskQueue.empty()) {
    const task = timeSliceTaskQueue.pop()!;
    task.exec();
  }
};
