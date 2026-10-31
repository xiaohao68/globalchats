import { FC } from "react";
import { ETaskStatus, Task } from "../../task";
import { RetryBtn } from "./misc/RetryBtn.tsx";
import { ThreeDotsWave } from "./misc/Loading.tsx";

export const MessageItem: FC<{ task: Task }> = ({ task }) => {
  // console.log(task);
  return (
    <div
      style={{
        fontSize: "14px",
        position: "relative",
        fontWeight: "normal",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        lineHeight: 1.2,
        // minHeight: `${14 * 1.2}px`
      }}
    >
      <RetryBtn onClick={() => task.retry()} />
      <div>
        {task.getCookedTextString}
        {task.status === ETaskStatus.failed && "翻译失败请重试"}
        {task.status === ETaskStatus.pending && <ThreeDotsWave />}
      </div>
    </div>
  );
};
