"use strict";

import { isFunction } from "lodash-es";

/**
 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
 * URI encoded counterparts
 *
 * @param {string} val The value to be encoded.
 *
 * @returns {string} The encoded value.
 */
function encode(val: string): string {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%20/g, "+")
    .replace(/%5B/gi, "[")
    .replace(/%5D/gi, "]");
}

/**
 * Check if the given value is an instance of URLSearchParams
 *
 * @param {any} val The value to check
 * @returns {boolean} True if the value is an instance of URLSearchParams
 */
function isURLSearchParams(val: any): val is URLSearchParams {
  return val instanceof URLSearchParams;
}

/**
 * Convert an object to a URLSearchParams instance
 *
 * @param {object} obj The object to convert
 * @param {Function} encoder The encoding function
 * @returns {URLSearchParams} The resulting URLSearchParams instance
 */
function objectToURLSearchParams(
  obj: Record<string, any>,
  encoder: (val: string) => string,
): URLSearchParams {
  const params = new URLSearchParams();

  Object.keys(obj).forEach((key) => {
    let value = obj[key];
    if (Array.isArray(value)) {
      value.forEach((item) =>
        params.append(encoder(key), encoder(String(item))),
      );
    } else {
      params.append(encoder(key), encoder(String(value)));
    }
  });

  return params;
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @param {?(object|Function)} options
 *
 * @returns {string} The formatted url
 */
export default function buildURL(
  url: string,
  params?: Record<string, any>,
  options?: any,
): string {
  if (!params) {
    return url;
  }

  const _encode = (options && options.encode) || encode;

  if (isFunction(options)) {
    options = {
      serialize: options,
    };
  }

  const serializeFn = options && options.serialize;

  let serializedParams: string;

  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else if (isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    serializedParams = objectToURLSearchParams(params, _encode).toString();
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");

    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }

  return url;
}
