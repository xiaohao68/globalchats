import { ComponentProps, FC, ReactNode } from "react";

interface Props extends ComponentProps<"div"> {
  condition: boolean;
  fallback?: ReactNode;
}

export const ConditionalRender: FC<Props> = ({
  condition,
  children,
  fallback = null,
}) => {
  return condition ? children : fallback;
};
