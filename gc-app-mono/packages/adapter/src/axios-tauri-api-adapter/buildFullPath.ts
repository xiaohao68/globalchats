"use strict";

const combineURLs = (baseURL: string, relativeURL: string) =>
  relativeURL
    ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "")
    : baseURL;
const isAbsoluteURL = (url: string = "") => {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};
export const buildFullPath = (
  baseURL: string = "",
  requestedURL: string = "",
) => {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};
