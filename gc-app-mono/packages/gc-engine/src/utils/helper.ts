import { noopBoolean, Nullable } from "@gc/utils";
import { noop } from "lodash-es";

export const pollExcFn = async <T = unknown>(
  excFn: () => Nullable<T>,
  timeout = 5_000,
  stopCallback: (stopFn: () => void) => void = noop,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    let startTime = 0;
    const frameTime = 17 * 2;

    const timerRef = setInterval((): void => {
      if (startTime > timeout) {
        clearInterval(timerRef);
        reject(new Error(`can't found result`));
        return;
      }
      const result = excFn();
      if (!!result) {
        resolve(result);
        clearInterval(timerRef);
        return;
      }
      startTime += frameTime;
    }, frameTime);

    stopCallback(() => {
      clearInterval(timerRef);
      reject(new Error("user cancel exc"));
    });
  });
};

export const getTextFromElement = (
  el: Element,
  excludeFn: (el: Element) => boolean = noopBoolean(),
): string => {
  let text = "";
  if (el.nodeType === Node.TEXT_NODE) {
    text += el.textContent || "";
    return text;
  }

  for (const child of el.childNodes) {
    if (excludeFn(child as Element)) {
      // TODO: 这里用break 还是 continue
      break;
    }
    text += getTextFromElement(child as Element);
  }

  return text;
};
