import { clone, isEmpty } from "lodash-es";
import { Task } from "../task";
import { addTimeSliceTask } from "@gc/misc";
import { createWithEqualityFn } from "zustand/traditional";

interface Store {
  //-------------------------------------------------------------------------------------
  // state
  //-------------------------------------------------------------------------------------

  receiveMessageTaskList: Record<string, Task>;
  inputRTTTask?: Task;

  //-------------------------------------------------------------------------------------
  // action
  //-------------------------------------------------------------------------------------
  addReceiveMessageTask: (tasks: Task[]) => void;
  updateReceiveMessageTasks: (tasks: Task[]) => void;
  removeReceiveMessageTasks: (taskIds: Task["id"][]) => void;
  clearReceiveMessageTasks: () => void;
  updateInputRTTTask: (task?: Task) => void;
  clearInputRTTTask: () => void;
  checkMessageStoreHealth: () => void;
}

export const useMessageStore = createWithEqualityFn<Store>(
  (setState, getState) => ({
    receiveMessageTaskList: {},
    inputRTTTask: undefined,

    //-------------------------------------------------------------------------------------
    // Actions
    //-------------------------------------------------------------------------------------
    checkMessageStoreHealth: () => {
      const receiveMessageTaskList = getState().receiveMessageTaskList;
      const inputRTTTask = getState().inputRTTTask;
      const shouldRemoveTaskList: Task["id"][] = [];
      Object.values(receiveMessageTaskList).forEach((task) => {
        if (task.isDestroyed) {
          shouldRemoveTaskList.push(task.id);
        }
        if (task.shouldDestroyed()) {
          shouldRemoveTaskList.push(task.id);
        }
      });

      if (!isEmpty(shouldRemoveTaskList)) {
        getState().removeReceiveMessageTasks(shouldRemoveTaskList);
      }

      if (inputRTTTask && inputRTTTask.shouldDestroyed()) {
        inputRTTTask.destroy();
        setState({
          inputRTTTask: undefined,
        });
      }
    },
    addReceiveMessageTask: (tasks) => {
      if (isEmpty(tasks)) {
        return;
      }
      // console.log("addReceiveMessageTask");
      // console.log(tasks);
      const receiveMessageTaskList = getState().receiveMessageTaskList;
      const checkMessageStoreHealth = getState().checkMessageStoreHealth;
      tasks.forEach((task) => {
        receiveMessageTaskList[task.id] = task;
      });

      addTimeSliceTask(checkMessageStoreHealth);
      setState({
        receiveMessageTaskList: clone(receiveMessageTaskList),
      });
    },
    updateReceiveMessageTasks: (tasks) => {
      if (isEmpty(tasks)) {
        return;
      }
      const receiveMessageTaskList = getState().receiveMessageTaskList;

      tasks.forEach((task) => {
        receiveMessageTaskList[task.id] = task;
      });

      setState({
        receiveMessageTaskList: clone(receiveMessageTaskList),
      });
    },
    removeReceiveMessageTasks: (taskIds) => {
      if (isEmpty(taskIds)) {
        return;
      }
      const receiveMessageTaskList = getState().receiveMessageTaskList;
      taskIds.forEach((taskId) => {
        let task = receiveMessageTaskList[taskId];
        task?.destroy();
        delete receiveMessageTaskList[taskId];
      });
      setState({
        receiveMessageTaskList: clone(receiveMessageTaskList),
      });
    },
    clearReceiveMessageTasks: () => {
      const receiveMessageTaskList = getState().receiveMessageTaskList;
      Object.values(receiveMessageTaskList).forEach((task) => {
        task.destroy();
      });

      setState({
        receiveMessageTaskList: {},
      });
    },

    updateInputRTTTask: (task) => {
      // const oldInputRTTTask = getState().inputRTTTask;
      // console.log("updateInputRTTTask");
      // console.log(task);
      setState({
        inputRTTTask: clone(task),
      });

      // oldInputRTTTask?.destroy();
    },
    clearInputRTTTask: () => {
      const inputRTTTask = getState().inputRTTTask;
      inputRTTTask?.destroy();
      setState({
        inputRTTTask: undefined,
      });
    },
  }),
);

export const messageStore = new Proxy<Store>({} as Store, {
  get(_target, propKey, receiver) {
    return Reflect.get(useMessageStore.getState(), propKey, receiver);
  },
});
