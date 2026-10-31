import type { FC } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

export const IconLoading: FC<LucideProps> = ({
  size = 16,
  className,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("fill-current", className)}
      {...props}
    >
      <circle cx="12" cy="2" r="0" fill="currentColor">
        <animate
          attributeName="r"
          begin="0"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
      <circle
        cx="12"
        cy="2"
        r="0"
        fill="currentColor"
        transform="rotate(45 12 12)"
      >
        <animate
          attributeName="r"
          begin="0.094s"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
      <circle
        cx="12"
        cy="2"
        r="0"
        fill="currentColor"
        transform="rotate(90 12 12)"
      >
        <animate
          attributeName="r"
          begin="0.188s"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
      <circle
        cx="12"
        cy="2"
        r="0"
        fill="currentColor"
        transform="rotate(135 12 12)"
      >
        <animate
          attributeName="r"
          begin="0.281s"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
      <circle
        cx="12"
        cy="2"
        r="0"
        fill="currentColor"
        transform="rotate(180 12 12)"
      >
        <animate
          attributeName="r"
          begin="0.375s"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
      <circle
        cx="12"
        cy="2"
        r="0"
        fill="currentColor"
        transform="rotate(225 12 12)"
      >
        <animate
          attributeName="r"
          begin="0.469s"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
      <circle
        cx="12"
        cy="2"
        r="0"
        fill="currentColor"
        transform="rotate(270 12 12)"
      >
        <animate
          attributeName="r"
          begin="0.563s"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
      <circle
        cx="12"
        cy="2"
        r="0"
        fill="currentColor"
        transform="rotate(315 12 12)"
      >
        <animate
          attributeName="r"
          begin="0.656s"
          calcMode="spline"
          dur="0.75s"
          keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
          repeatCount="indefinite"
          values="0;2;0;0"
        />
      </circle>
    </svg>
  );
};
