type Maybe<T = unknown> = T | undefined | null;
type Nullable<T = unknown> = Maybe<T>;
type MaybeNull<T = unknown> = T | null;
type NullablePromise<T = unknown> = Promise<Nullable<T>>;
type PickArray<T, K extends (keyof T)[]> = Pick<T, K[number]>;
type FN<T = unknown, R = void> = (arg: T) => R;
type Noop = () => void;

enum ETaskStatus {
  none = "none", // 没有内容
  pending = "pending",
  success = "success",
  failed = "failed",
  locked = "locked", // 大文本需要手动解锁翻译
  replaced = "replaced",
  forceUpdate = "forceUpdate",
}

enum ETaskType {
  inputRTT = "inputRTT",
  receiveMessage = "receiveMessage",
}

class Task {
  id: string;
  type: ETaskType;
  status: ETaskStatus;
  target: Element;
  attachContainer: Element;
  sendMessageBtn: Nullable<Element>;
  rawTextList: string[];
  cookedTextList: (string | Error)[];
  isSelf: boolean;
  isDestroyed: boolean;
  cancel: () => void;

  getRawTextString: string;
  getCookedTextString: string;

  constructor(
    target: Task["target"],
    attachContainer: Task["attachContainer"],
    sendMessageBtn: Task["sendMessageBtn"],
  );

  shouldDestroyed(): boolean;

  clear(): void;

  detachDom(): void;

  destroy(): void;

  retry(): void;

  validSendMessageText(): boolean;
}

declare interface Node {
  task?: Task;
}
