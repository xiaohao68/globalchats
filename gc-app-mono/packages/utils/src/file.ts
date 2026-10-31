import { ContentTypeToExtension } from "@gc/model";
import { makeUUID } from "./helper.ts";
import { lib, SHA256 } from "crypto-js";

export const computeSHA256 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        resolve(computesSHA256ByFile(event.target.result as ArrayBuffer));
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
export const computesSHA256ByFile = (file: ArrayBuffer) =>
  SHA256(lib.WordArray.create(file)).toString();

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export const makeMultipartFormData = (file: ArrayBuffer, fileName: string) => {
  // 生成一个随机的 boundary
  const boundary = "----WebKitFormBoundary" + makeUUID();

  // 构建 multipart/form-data 请求体
  let body = "";
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
  body += `Content-Type: application/octet-stream\r\n\r\n`;

  // 将 body 字符串转换为 Uint8Array
  const bodyStart = new TextEncoder().encode(body);

  // 添加文件结束标记
  const bodyEnd = stringToUint8Array(`\r\n--${boundary}--\r\n`);

  // 合并所有部分到一个 ArrayBuffer
  const fullBody = new Uint8Array(
    bodyStart.length + file.byteLength + bodyEnd.length,
  );
  fullBody.set(bodyStart, 0);
  fullBody.set(new Uint8Array(file), bodyStart.length);
  fullBody.set(bodyEnd, bodyStart.length + file.byteLength);

  return {
    body: fullBody,
    boundary,
  };
};
export const getExtensionByContentType = (contentType: string) => {
  return ContentTypeToExtension[contentType] || "";
};

export const makeObjectToSearchQuery = (
  params: Record<string, string | boolean | number | undefined>,
) => {
  return new URLSearchParams(params as Record<string, string>).toString();
};

export const blobUrlToArrayBuffer = async (blobUrl: string) => {
  // 1. 通过 fetch 获取 Blob 对象
  const response = await fetch(blobUrl);
  return await response.arrayBuffer();
};
