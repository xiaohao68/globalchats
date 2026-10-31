import { FC, PropsWithChildren } from "react";
import { isEmpty } from "lodash-es";

export const EmptyText: FC<PropsWithChildren> = ({ children }) => {
  return isEmpty(children) ? "-" : children;
};
