import { hasChinese, makeUUID, Nullable, reduceString } from "@gc/utils";
import { isEmpty, noop } from "lodash-es";
import { receiveMessageQueue } from "./queue.ts";
import { scheduler } from "../scheduler";
import { triggerKeyupEvent } from "@gc/misc";
import { appStore } from "@gc/store";
import { LanguageCodes } from "@gc/model";

export enum ETaskStatus {
  none = "none", // 没有内容
  pending = "pending",
  success = "success",
  failed = "failed",
  locked = "locked", // 大文本需要手动解锁翻译
  replaced = "replaced",
  forceUpdate = "forceUpdate",
}

export enum ETaskType {
  inputRTT = "inputRTT",
  receiveMessage = "receiveMessage",
}

// export enum EConfirmStatus {
//     none, // none
//     pending, // 等待用户确认
//     confirmed, // 用户已经确认
//     canceled, // 用户已经取消
//     timeout, // 超时未响应
//     error, // 发生错误
// }

export class Task {
  id: string = makeUUID();
  type: ETaskType;
  status: ETaskStatus = ETaskStatus.none;
  target: Element;
  attachContainer: Element;
  sendMessageBtn: Nullable<Element>;
  // confirmStatus: EConfirmStatus
  rawTextList: string[] = [];
  cookedTextList: (string | Error)[] = [];
  // cookedTextArray?: string[]
  // childNodes?: (HTMLElement | string)[]
  isSelf: boolean = false;
  isDestroyed: boolean = false;

  cancel: () => void = noop;

  constructor(
    type: ETaskType,
    target: Task["target"],
    attachContainer: Task["attachContainer"],
    sendMessageBtn?: Task["sendMessageBtn"],
  ) {
    this.type = type;
    this.target = target;
    this.attachContainer = attachContainer;
    this.sendMessageBtn = sendMessageBtn;
    this.status = ETaskStatus.pending;
  }

  get getRawTextString() {
    return reduceString(...this.rawTextList);
  }

  get getCookedTextString() {
    return reduceString(...(this.cookedTextList as string[]));
  }

  // get getCookedTextStringWithError() {
  //     return reduceString(...this.cookedTextList as string[])
  // }

  shouldDestroyed(): boolean {
    // return !this.target.parentNode;
    return !this.target?.isConnected;
  }

  clear() {
    this.detachDom();
    this.status = ETaskStatus.none;
    this.target = null!;
    this.attachContainer = null!;
    this.sendMessageBtn = null;
    this.rawTextList = [];
    this.cookedTextList = [];
    this.isDestroyed = true;

    this.cancel = noop;
  }

  detachDom() {
    const targetDom = this.target;
    targetDom.task = undefined;
  }

  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.cancel();
    this.clear();
  }

  retry() {
    this.status = ETaskStatus.pending;
    this.cookedTextList = [];

    if (this.type === ETaskType.receiveMessage) {
      // messageStore.updateReceiveMessageTasks([this]);
      receiveMessageQueue.push(this);
      scheduler.beginReceiveMessageWork();
    } else {
      const inputDom = this.target;
      triggerKeyupEvent(inputDom);
      // messageStore.updateInputRTTTask(this);
      // inputRTTQueue.push(this);
      // scheduler.beginInputRTTWork(this);
    }
  }

  validSendMessageText(): boolean {
    if (!appStore.shouldTranslateInputMessage()) {
      return true;
    }
    const translateConfig = appStore.getCurrentChatUserTranslateConfigByAppId();
    if (isEmpty(!translateConfig)) {
      return true;
    }
    if (
      [
        LanguageCodes.zh,
        LanguageCodes["zh-CN"],
        LanguageCodes["zh-HK"],
        LanguageCodes["zh-MO"],
        LanguageCodes["zh-SG"],
        LanguageCodes["zh-TW"],
        LanguageCodes["ja"],
        LanguageCodes["ja-JP"],
      ].includes(translateConfig!.sendMessage.to)
    ) {
      return true;
    }
    hasChinese(this.cookedTextList as string[]);
    return hasChinese(this.cookedTextList as string[]);
  }
}
