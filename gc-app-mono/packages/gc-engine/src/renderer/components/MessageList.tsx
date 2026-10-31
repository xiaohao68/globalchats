import { FC } from "react";
import { useMessageStore } from "../../store";
import { map } from "lodash-es";
import { createPortal } from "react-dom";
import { MessageItem } from "./MessageItem.tsx";

export const MessageList: FC = () => {
  const receiveMessageTaskList = useMessageStore(
    (store) => store.receiveMessageTaskList,
  );

  // console.log("receiveMessageTaskList");
  // console.log(receiveMessageTaskList);

  return map(receiveMessageTaskList, (task) =>
    createPortal(
      <MessageItem key={task.id} task={task}></MessageItem>,
      task.attachContainer,
    ),
  );
};
