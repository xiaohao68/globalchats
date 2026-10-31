import { ETaskStatus, inputRTTQueue, receiveMessageQueue, Task } from "../task";
import { MaxTranslateTextLength } from "@gc/model";
import { messageStore } from "../store";
import { translator } from "./translator.ts";
import { debounce, isEmpty, noop } from "lodash-es";
import { isCancel } from "axios";

class Scheduler {
  flushReceiveMessageQueue() {
    if (receiveMessageQueue.empty()) {
      return;
    }

    let tempTaskList: Task[] = [];
    let tempRawTextList: string[] = [];
    let tempRawTextSumLength = 0;

    while (!receiveMessageQueue.empty()) {
      const task = receiveMessageQueue.pop()!;

      if (
        task.getRawTextString.length + tempRawTextSumLength >
        MaxTranslateTextLength
      ) {
        // TODO: flush
        this.flush(tempRawTextList, tempTaskList);
        tempTaskList = [];
        tempRawTextList = [];
        tempRawTextSumLength = 0;
      }
      tempTaskList.push(task);
      tempRawTextList.push(task.getRawTextString);
      tempRawTextSumLength += task.rawTextList.length;
    }
    this.flush(tempRawTextList, tempTaskList);
  }

  clearInputRTTMessageQueue() {
    while (!inputRTTQueue.empty()) {
      inputRTTQueue.pop()?.cancel();
    }
  }

  async flushInputRTTQueue() {
    if (inputRTTQueue.empty()) {
      return;
    }
    const inputTask = inputRTTQueue.pop()!;
    try {
      const cookedTextList = await translator.inputRTTMessage(inputTask);
      this.attachInputRTTCookedTextToTask(cookedTextList, inputTask);
    } catch (error: any) {
      if (isCancel(error)) {
        return;
      }
      inputTask.status = ETaskStatus.failed;
      inputTask.cookedTextList = [error];
      inputTask.cancel = noop;
    } finally {
      messageStore.updateInputRTTTask(inputTask);
    }
  }

  async flush(rawTextList: string[], taskList: Task[]) {
    if (!rawTextList.length) {
      return;
    }
    try {
      // console.log(rawTextList)
      // console.log("rawTextList")
      const cookedTextList = await translator.receiveMessage(
        rawTextList,
        taskList,
      );
      // console.log("cookedTextList")
      // console.log(cookedTextList)
      this.attachCookedTextListToTaskList(cookedTextList, taskList);
      messageStore.updateReceiveMessageTasks(taskList);
    } catch (error: any) {
      if (isCancel(error)) {
        return;
      }
      taskList.forEach((task) => {
        task.status = ETaskStatus.failed;
        task.cookedTextList = [error];
        task.cancel = noop;
        messageStore.updateReceiveMessageTasks(taskList);
      });
    }
  }

  private attachCookedTextListToTaskList(
    cookedTextList: Task["cookedTextList"],
    taskList: Task[],
  ) {
    if (cookedTextList.length !== taskList.length) {
      throw new Error("翻译前后结果对不上");
    }

    taskList.map((task, index) => {
      const cookedText = cookedTextList[index]!;
      task.cookedTextList = [cookedText];
      task.status = ETaskStatus.success;
      task.cancel = noop;
      if (cookedText instanceof Error) {
        task.status = ETaskStatus.failed;
      }
    });
  }

  private attachInputRTTCookedTextToTask(
    cookedTextList: Task["cookedTextList"],
    task: Task,
  ) {
    task.cancel = noop;
    task.cookedTextList = cookedTextList;
    if (isEmpty(cookedTextList)) {
      task.status = ETaskStatus.none;
      return;
    }

    const hasError = cookedTextList.some((it) => it instanceof Error);

    // console.log("hasError")
    // console.log(hasError)
    if (hasError) {
      task.status = ETaskStatus.failed;
      return;
    }
    task.status = ETaskStatus.success;
  }

  private safeUpdateCookedText(cookedText: Task["cookedTextList"], task: Task) {
    if (cookedText) {
      // TODO:
    }
  }

  beginReceiveMessageWork() {
    // console.log("beginReceiveMessageWork")
    this.flushReceiveMessageQueue();
  }

  beginInputRTTWork = debounce(
    (task: Task) => {
      this.clearInputRTTMessageQueue();
      inputRTTQueue.push(task);
      messageStore.updateInputRTTTask(task);
      this.flushInputRTTQueue();
    },
    250,
    {
      leading: true,
    },
  );
}

export const scheduler = new Scheduler();
