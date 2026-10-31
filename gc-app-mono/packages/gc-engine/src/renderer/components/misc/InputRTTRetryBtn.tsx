import { ComponentProps, FC } from "react";
import { IconTranslate } from "../../icons/IconTranslate.tsx";
import { noop } from "lodash-es";

export const InputRTTRetryBtn: FC<ComponentProps<"button">> = ({
  onClick = noop,
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        left: 0,
        bottom: 0,
      }}
    >
      <div
        style={{
          flexGrow: 1,
          height: 0,
          borderTop: "1px dashed #ccc",
        }}
      />
      <IconTranslate onClick={onClick} size={16} className="gc-app-icon" />
      <div
        style={{
          flexGrow: 1,
          height: 0,
          borderTop: "1px dashed #ccc",
        }}
      />
    </div>
  );
};
