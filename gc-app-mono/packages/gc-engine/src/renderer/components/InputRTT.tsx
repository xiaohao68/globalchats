import { FC, memo } from "react";
import { createPortal } from "react-dom";
import { useMessageStore } from "../../store";
import { ETaskStatus } from "../../task";
import { ThreeDotsWave } from "./misc/Loading.tsx";
import { InputRTTRetryBtn } from "./misc/InputRTTRetryBtn.tsx";
// import {Input} from "@gc/ui/components/input";

export const inputRTTBgColor = {
  [ETaskStatus.locked]: "fff7e6",
  [ETaskStatus.failed]: "#ffeded",
  [ETaskStatus.none]: "unset",
  [ETaskStatus.pending]: "unset",
  [ETaskStatus.success]: "unset",
  [ETaskStatus.replaced]: "unset",
  [ETaskStatus.forceUpdate]: "unset",
};

export const InputRTT: FC = memo(() => {
  const inputRTTTask = useMessageStore((store) => store.inputRTTTask)!;
  // console.log("inputRTTTask com");
  // console.log(inputRTTTask);
  // const platform = useAppStore((store) => store.getPlatformById());
  //
  // console.log(platform);

  return createPortal(
    <div
      style={{
        borderTopLeftRadius: "inherit",
        borderTopRightRadius: "inherit",

        // minHeight: "54px",
        alignItems: "center",
        backgroundColor: inputRTTBgColor[inputRTTTask.status],
        position: "relative",
        paddingBottom: "16px",
        wordWrap: "break-word",
        width: "100%",
      }}
      hidden={inputRTTTask.status === ETaskStatus.none}
    >
      {/*  翻译结果 */}
      <div
        style={{
          fontSize: "14px",
          maxHeight: "120px",
          overflowY: "auto",
          color: "#999",
          width: "100%",
          padding: "15px 15px 0 15px",
          boxSizing: "border-box",
        }}
      >
        {inputRTTTask.getCookedTextString}
        {inputRTTTask.status === ETaskStatus.pending && <ThreeDotsWave />}
      </div>

      <InputRTTRetryBtn onClick={() => inputRTTTask.retry()} />
    </div>,

    inputRTTTask?.attachContainer,
  );
});
