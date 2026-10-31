import { logWarning, runtimeAdapter } from "./runtime-adapter";
import type { ApiUpdate, ApiUpdateNewMessage, ApiUser } from "./types/tg";
import type { ApiMessage } from "./types/tg/messages";
import { log } from "./utils";

class TelegramAdapter {
  coreModules: any;

  async init(): Promise<void> {
    await runtimeAdapter.init();

    const store = runtimeAdapter.findModule((_, moduleFactory) => {
      const str = moduleFactory.toString();

      return [
        "getPromiseActions",
        "addActionHandler",
        "GLOBAL CONTAINERS",
      ].every((v) => str.includes(v));
    });
    if (!store) {
      logWarning("can not find store module");
      return;
    }

    const exportStoreKey = runtimeAdapter.findExports(
      store?.moduleId,
      (moduleFactory) => {
        const str = moduleFactory.toString();

        return ["getPromiseActions", "addActionHandler"].every((v) =>
          str.includes(v),
        );
      },
    );

    const obj: Record<string, any> = {};
    obj.store = store.moduleInstance[exportStoreKey!]();
    window.o = obj;
    this.coreModules = {
      ...obj.store,
    };

    const callApi = runtimeAdapter.findModule((_, moduleFactory) => {
      const str = moduleFactory.toString();

      return ['new Set(["destroy"])', "methodResponse"].every((v) =>
        str.includes(v),
      );
    });
    if (!callApi) {
      logWarning("can not find callApi module");
      return;
    }

    const exportCallApiKey = runtimeAdapter.findExports(
      callApi?.moduleId,
      (moduleFactory) => {
        const str = moduleFactory.toString();

        return ["callMethod", "postMessage({"].every((v) => str.includes(v));
      },
    );

    this.coreModules.callApi = callApi.moduleInstance[exportCallApiKey!];

    console.log(
      "found store module: ",
      callApi,
      exportStoreKey,
      exportCallApiKey,
      obj,
    );
  }

  getGlobal() {
    return this.coreModules.getGlobal();
  }

  getContacts(): ApiUser[] {
    const global = this.getGlobal();
    const contactIds = global.contactList?.userIds || [];
    const contacts = contactIds.map((id: string) => global.users.byId[id]);

    return contacts as ApiUser[];
  }

  sendMessage(chatId: string, text: string): void {
    const action = this.coreModules.getActions();

    action.sendMessage({
      messageList: {
        chatId,
        threadId: -1,
        type: "thread",
      },
      text,
    });
  }

  async getMessages(chatId: string, offsetId?: string) {
    const chat = this.coreModules.getGlobal().chats.byId[chatId];

    if (!chat) {
      logWarning(`can not find chat: ${chatId}`);
      return;
    }

    const result = (await this.coreModules.callApi?.("fetchMessages", {
      chat,
      threadId: -1,
      offsetId,
      addOffset: -1,
      limit: 10,
      isSavedDialog: false,
    })) as { messages: ApiMessage[]; count: number; users: ApiUser[] };

    return result;
  }

  subscribeNewMessages(callback: (message: ApiUpdateNewMessage) => void): void {
    this.coreModules.addActionHandler(
      "apiUpdate",
      (_: any, _1: any, update: ApiUpdate) => {
        switch (update["@type"]) {
          case "newMessage":
            callback(update);
            break;
          case "updateMessageSendSucceeded":
            // Handle message send succeeded
            break;
          default:
            break;
        }
      },
    );
  }
}

const telegramAdapter = new TelegramAdapter();
window.ta = telegramAdapter;
telegramAdapter.init().then(() => {
  telegramAdapter.subscribeNewMessages((msg) => {
    log.recv("New message: ", msg);
  });
});
