import { Nullable } from "./types.ts";
import { domReady } from "./helper.ts";
import { BlockTag } from "@gc/model";

export const getTextFromElement = (
  element: Element,
  excludeFn: (element: Element) => boolean = () => false,
): string => {
  let result = "";
  if (!element) {
    return result;
  }
  if (element.nodeType === Node.TEXT_NODE) {
    result = element.textContent || "";
  } else {
    for (const child of element.childNodes) {
      if (excludeFn(child as Element)) {
        break;
      }

      result += getTextFromElement(child as Element) + "\n";
    }
  }
  return result;
};

export const getFullTextFromElement = (
  el: Element,
  excludeFn: (element: Element) => boolean = () => false,
) => {
  if (!el) {
    return [];
  }
  const textList: string[] = [];
  let currentLine = "";

  const processNode = (element: Element) => {
    if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent?.replace(/\r\n/g, "\n") || "";
      const parts = text.split("\n");
      parts.forEach((st, index) => {
        if (index === 0) {
          currentLine += st;
        } else {
          textList.push(currentLine);
          currentLine = st;
        }
      });
    } else {
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          processNode(child as Element);
        } else if (excludeFn(child as Element)) {
          break;
        } else if (isBlockElement(child as Element)) {
          textList.push(currentLine);
          currentLine = "";
          processNode(child as Element);
        } else {
          processNode(child as Element);
          // lines.push(text);
        }
      }
    }
  };

  processNode(el);
  textList.push(currentLine);
  currentLine = "";

  return textList.reduce((acc, st): string[] => {
    const text = st.replace(/\n/g, "");
    if (text.trim() === "") {
      return acc;
    }
    acc.push(text);
    return acc;
  }, [] as string[]);
};

export const getLastNodeOfQuerySelectorAll = (
  selector: string,
  selectorParentDom: Node = document,
): Nullable<HTMLElement> => {
  if (!selectorParentDom) {
    return;
  }
  const nodes = (selectorParentDom as HTMLElement).querySelectorAll(selector);
  if (!nodes.length) {
    return;
  }
  return nodes[nodes.length - 1] as HTMLElement;
};

export const attachStyleSheet = async (styles: string) => {
  await domReady();
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);
};

export const isBlockElement = (element: Element) => {
  if (!element) {
    return false;
  }

  return BlockTag.includes(element.tagName.toLowerCase());
};

export const selectElementByXpath = <T = HTMLElement>(
  xPath: string,
): Nullable<T> => {
  return document.evaluate(
    xPath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue as T;
};
