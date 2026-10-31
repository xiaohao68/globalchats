import { appStore } from "@gc/store";
import { apiTranslate } from "@gc/api";
import { Task } from "../task";
import { messageStore } from "../store";
import { isEmpty, once } from "lodash-es";

export class Translator {
  async receiveMessage(
    textList: string[],
    taskList: Task[],
  ): Promise<Task["cookedTextList"]> {
    console.log("Translator.receiveMessage rawTextList");
    console.log(textList);
    const controller = new AbortController();
    const translateConfig = appStore.getCurrentChatUserTranslateConfigByAppId();
    console.log("translateConfig");
    console.log(translateConfig);
    if (!translateConfig) return [];

    const cancel = once(() => {
      controller.abort();
    });
    taskList.forEach((task) => (task.cancel = cancel));
    messageStore.updateReceiveMessageTasks(taskList);

    const data = await apiTranslate(
      {
        srcLang: translateConfig.receiveMessage.from,
        // 目标语种
        dstLang: translateConfig.receiveMessage.to,
        // 翻译内容
        texts: textList,
        id: translateConfig.modelId,
      },
      controller.signal,
    );

    console.log("Translator.receiveMessage cookedTextList");
    console.log(data);

    return data;
  }

  async inputRTTMessage(task: Task): Promise<Task["cookedTextList"]> {
    const textList = task.rawTextList;
    console.log("Translator.inputRTTMessage rawTextList");
    console.log(textList);

    if (isEmpty(textList)) {
      return [];
    }

    const controller = new AbortController();
    const translateConfig = appStore.getCurrentChatUserTranslateConfigByAppId();
    console.log("translateConfig");
    console.log(translateConfig);
    if (!translateConfig) return [];

    task.cancel = once(() => {
      console.log("取消输入请求了");
      controller.abort();
    });
    // console.log("input textList")
    // console.log(textList)
    // console.log(translateConfig)
    const data = await apiTranslate(
      {
        srcLang: translateConfig.sendMessage.from,
        // 目标语种
        dstLang: translateConfig.sendMessage.to,
        // 翻译内容
        texts: textList,
        id: translateConfig.modelId,
      },
      controller.signal,
    );
    // console.log("Translator.inputRTTMessage cookedTextList");
    // console.log(data);

    return data;
  }
}

export const translator = new Translator();
