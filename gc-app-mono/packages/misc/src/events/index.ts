import { curryRight, isArray, noop } from "lodash-es";
import { Nullable, sleep } from "@gc/utils";
import { SyntheticEvent, useCallback } from "react";

const createEventByName = (
  eventName: string,
  options = {
    bubbles: true,
    cancelable: true,
  },
) => {
  // 鼠标事件
  const mouseEvents = [
    "click",
    "dblclick",
    "mousedown",
    "mouseup",
    "mousemove",
    "mouseover",
    "mouseout",
    "mouseenter",
    "mouseleave",
    "contextmenu",
    "wheel",
  ];

  // 键盘事件
  const keyboardEvents = ["keydown", "keyup", "keypress"];

  // UI 事件
  const uiEvents = [
    "load",
    "unload",
    "abort",
    "error",
    "select",
    "resize",
    "scroll",
  ];

  // 焦点事件
  const focusEvents = ["blur", "focus", "focusin", "focusout"];

  // 表单事件
  const formEvents = ["reset", "submit", "change", "input"];

  // 触摸事件
  const touchEvents = ["touchstart", "touchend", "touchmove", "touchcancel"];

  // 拖动事件
  const dragEvents = [
    "drag",
    "dragstart",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "drop",
  ];

  // 剪贴板事件
  const clipboardEvents = ["copy", "cut", "paste"];

  // 媒体事件
  const mediaEvents = [
    "play",
    "pause",
    "ended",
    "volumechange",
    "timeupdate",
    "loadeddata",
    "canplay",
  ];

  // 动画事件
  const animationEvents = [
    "animationstart",
    "animationend",
    "animationiteration",
  ];

  // 过渡事件
  const transitionEvents = ["transitionend"];

  // 窗口事件
  const windowEvents = [
    "resize",
    "scroll",
    "online",
    "offline",
    "popstate",
    "hashchange",
  ];

  // 存储事件
  const storageEvents = ["storage"];

  if (mouseEvents.includes(eventName)) {
    return new MouseEvent(eventName, options);
  } else if (keyboardEvents.includes(eventName)) {
    return new KeyboardEvent(eventName, options);
  } else if (uiEvents.includes(eventName)) {
    return new UIEvent(eventName, options);
  } else if (focusEvents.includes(eventName)) {
    return new FocusEvent(eventName, options);
  } else if (formEvents.includes(eventName)) {
    return new Event(eventName, options);
  } else if (touchEvents.includes(eventName)) {
    return new TouchEvent(eventName, options);
  } else if (dragEvents.includes(eventName)) {
    return new DragEvent(eventName, options);
  } else if (clipboardEvents.includes(eventName)) {
    return new ClipboardEvent(eventName, options);
  } else if (mediaEvents.includes(eventName)) {
    return new Event(eventName, options);
  } else if (animationEvents.includes(eventName)) {
    return new AnimationEvent(eventName, options);
  } else if (transitionEvents.includes(eventName)) {
    return new TransitionEvent(eventName, options);
  } else if (windowEvents.includes(eventName)) {
    return new Event(eventName, options);
  } else if (storageEvents.includes(eventName)) {
    return new StorageEvent(eventName, options);
  } else {
    // 对于其他类型的事件，使用通用的 Event 构造函数
    return new Event(eventName, options);
  }
};

export const triggerEvent = curryRight(
  (eventTarget: Nullable<Node | Window>, eventName: string) => {
    if (!eventTarget) {
      return;
    }
    const event = createEventByName(eventName);
    eventTarget.dispatchEvent(event);
  },
);
export const triggerInputEvent = triggerEvent("input");
export const triggerClickEvent = triggerEvent("click");
export const triggerFocusEvent = triggerEvent("focus");
export const triggerMouseDownEvent = triggerEvent("mousedown");
export const triggerKeydownEvent = triggerEvent("keydown");
export const triggerKeyupEvent = triggerEvent("keyup");
export const triggerSubmitEvent = triggerEvent("submit");
export const triggerEscEvent = () => {
  const escEvent = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    // keyCode: 27,
    // which: 27,
    // shiftKey: false,
    // ctrlKey: false,
    // altKey: false,
    // metaKey: false,
    bubbles: true,
    cancelable: true,
  });
  // window.dispatchEvent(escEvent)
  document.dispatchEvent(escEvent);
};
export const triggerPopstateEvent = triggerEvent("popstate");
export const clearInputContent = async (
  inputDom: HTMLElement,
  shouldDeleteInputValue = false,
): Promise<void> => {
  if (!inputDom) {
    return;
  }
  inputDom.focus();
  await sleep(10);
  const range = document.createRange();
  const selection = window.getSelection()!;
  // if (!selection) {
  //   return;
  // }
  // 选中元素内的所有内容
  range.selectNodeContents(inputDom);
  // 清除当前的选区
  selection.removeAllRanges();
  // 添加新的选区
  selection.addRange(range);
  if (shouldDeleteInputValue) {
    range.deleteContents();
    triggerInputEvent(inputDom);
  }

  // ! 需要等待10ms (等待原生应用逻辑执行完成)
  await sleep(10);
  // > 执行删除
  // inputDom.dispatchEvent(
  //   new KeyboardEvent("keydown", {
  //     bubbles: true,
  //     cancelable: true,
  //     keyCode: 8,
  //     which: 8,
  //     location: 0,
  //     key: "Backspace",
  //   }),
  // );
};

export const replaceInputContent = async (
  inputDom: HTMLElement,
  text: string | string[],
  shouldDeleteInputValue = false,
) => {
  if (!inputDom) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  await clearInputContent(inputDom, shouldDeleteInputValue);

  // > 执行新增
  const dt = new DataTransfer();
  if (isArray(text)) {
    text = text.join("\n");
  }

  dt.setData("text/plain", text);
  inputDom.dispatchEvent(
    new ClipboardEvent("paste", {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );
  dt.clearData();
  await sleep(10);
};

export const useStopPropagationEvent = (fn = noop, deps = []) => {
  return useCallback((event: Event | SyntheticEvent) => {
    event.stopPropagation();
    fn();
  }, deps);
};
