export type Maybe<T = unknown> = T | undefined | null;
export type Nullable<T = unknown> = Maybe<T>;
export type MaybeNull<T = unknown> = T | null;
export type MaybeUndefined<T = unknown> = T | undefined;
export type NullablePromise<T = unknown> = Promise<Nullable<T>>;
export type PickArray<T, K extends (keyof T)[]> = Pick<T, K[number]>;
export type FN<T = unknown, R = void> = (arg: T) => R;
export type Noop = () => void | Promise<void>;
export type UnlistenerFn = () => void;

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};
export type SelectOptions = SelectOption[];
