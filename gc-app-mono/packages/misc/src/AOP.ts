import { curryRight, noop } from "lodash-es";

type AnyFunction = (...args: any[]) => any;

export const implAOP: AnyFunction = curryRight(
  (
    targetFn: AnyFunction,
    beforeFn: AnyFunction,
    afterFn: (beforeResult: any, targetResult: any, ...args: any[]) => any,
  ) => {
    return (...args: any[]) => {
      const beforeResult = beforeFn(...args);
      const result = targetFn(...args);
      afterFn(beforeResult, result, ...args);
      return result;
    };
  },
);
export const beforeAOP = implAOP(noop);
export const afterAOP = implAOP(noop, curryRight.placeholder);

// Promised AOP

export const implAOPAsync: AnyFunction = curryRight(
  (
    targetFn: AnyFunction,
    beforeFn: AnyFunction,
    afterFn: (beforeResult: any, targetResult: any, ...args: any[]) => any,
  ) => {
    return async (...args: any[]) => {
      const beforeResult = await beforeFn(...args);
      const result = await targetFn(...args);
      await afterFn(beforeResult, result, ...args);
      return result;
    };
  },
);

export const beforeAOPAsync = implAOPAsync(
  (_beforeResult: any, _targetResult: any) => {},
);

export const afterAOPAsync = implAOPAsync(noop, curryRight.placeholder);
