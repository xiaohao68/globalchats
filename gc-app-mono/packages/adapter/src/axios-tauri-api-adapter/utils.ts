"use strict";

const { toString } = Object.prototype;

const kindOf = ((cache) => (thing: any) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));

const kindOfTest = (type: any) => {
  type = type.toLowerCase();
  return (thing: any) => kindOf(thing) === type;
};

export const isURLSearchParams = kindOfTest("URLSearchParams");
