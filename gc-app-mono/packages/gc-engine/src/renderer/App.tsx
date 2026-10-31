import { FC } from "react";
import { useMessageStore } from "../store";
import { InputRTT } from "./components/InputRTT.tsx";
import { MessageList } from "./components/MessageList.tsx";

export const App: FC = () => {
  const inputRTTTask = useMessageStore((store) => store.inputRTTTask);

  return (
    <>
      {inputRTTTask && <InputRTT />}

      <MessageList />
    </>
  );
};
