import { v4, v5 } from "uuid";
import { Webview } from "@tauri-apps/api/webview";
import { MainWebviewId, SideWebviewId } from "@gc/model";
import { isString } from "lodash-es";
import { Noop, Nullable } from "./types.ts";

export const reduceString = (...args: Nullable<string>[]): string => {
  return args.reduce((acc: string, s) => {
    if (!isString(s)) {
      return acc;
    }

    return acc + s!;
  }, "");
};
export const sleep = (ms = 0): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(void 0);
    }, ms);
  });
};

export const nextTickByTimeout = (cb: Noop, ms = 0) => {
  setTimeout(() => {
    cb();
  }, ms);
};

export const makeUUID = (): string => {
  return v4();
};
export const makeUUIDByHash = (hash: string) => {
  const MY_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";
  return v5(hash, MY_NAMESPACE);
};

// export const makeHashId = (): string => {};

export const noopBoolean = (b: boolean = false) => {
  return () => b;
};

// 检查是否在 Tauri WebView 环境中运行
export const isRunningInTauri = (): boolean => {
  try {
    return !!(window as any)?.__TAURI_INTERNALS__?.metadata?.currentWebview?.label;
  } catch {
    return false;
  }
};

export const defaultTransition = "transition-all duration-150 ease-linear";

export const getElementOffsets = (element: Element) => {
  const rect = element.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();

  return {
    left: rect.left - bodyRect.left,
    top: rect.top - bodyRect.top,
    right: bodyRect.right - rect.right,
    bottom: bodyRect.bottom - rect.bottom,
  };
};

let isReady =
  document?.readyState === "complete" || document?.readyState === "interactive";

export const domReady = () => {
  return new Promise((resolve) => {
    if (isReady) {
      resolve(null);
    } else {
      const handleReadyStateChange = () => {
        isReady = true;
        resolve(null);
        window.removeEventListener("DOMContentLoaded", handleReadyStateChange);
      };
      window.addEventListener("DOMContentLoaded", handleReadyStateChange);
    }
  });
};

export const getCurrentWebviewId = (): string => {
  if (!isRunningInTauri()) {
    return "main";
  }
  try {
    const webview = Webview.getCurrent();
    return webview?.label ?? "main";
  } catch {
    return "main";
  }
};

export const isMainWebview = () => {
  return getCurrentWebviewId() === MainWebviewId;
};
export const isSideWebview = () => {
  return getCurrentWebviewId() === SideWebviewId;
};

export const isThirdApp = () => {
  return !isMainWebview() && !isSideWebview();
};

export const hasChinese = (str: string | string[]): boolean => {
  const chineseRegex = /[\u4e00-\u9fff]/;
  return isString(str)
    ? chineseRegex.test(str)
    : str?.every((v) => chineseRegex.test(v));
};
