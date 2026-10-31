import { AbstractLifeCycle, slowEventLoop, slowEventLoopQueue } from "@gc/misc";
import Dexie from "dexie";
import { ITgGlobalState } from "../model";
import { forEach, isEmpty } from "lodash-es";
import { appStore } from "@gc/store";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { IThirdAppUserInfo, MainWebviewId } from "@gc/model";
import { getCurrentWebviewId, Nullable, reduceString } from "@gc/utils";
import { telegramSDK } from "../sdk";

class TelegramIndexedDB implements AbstractLifeCycle {
  #dbName = "tt-data";
  #dbTable = "store";
  #globalStateKey = "tt-global-state";
  #db!: Dexie;

  tgGlobalState?: ITgGlobalState;

  async mount() {
    this.#db = new Dexie(this.#dbName);
    try {
      await this.#db.open();
      slowEventLoopQueue.pushBack(async () => {
        if (!telegramSDK.isLoginEd) {
          return;
        }

        await this.todo();
      });
      slowEventLoop();
    } catch (error) {
      console.error(error);
    }
  }

  destroy() {
    this.#db.close();
  }

  getChatUserInfoById(userId: string): Nullable<IThirdAppUserInfo> {
    if (telegramSDK.isGroup(userId)) {
      const chat = this.tgGlobalState?.chats.byId[userId];
      if (!chat) {
        return;
      }
      return {
        id: userId,
        nickname: chat?.title!,
        avatar: chat?.avatarPhotoId!,
        isGroup: true,
      };
    }
    const user = this.tgGlobalState?.users.byId[userId];
    if (!user) {
      return;
    }
    return {
      id: userId,
      nickname: reduceString(user?.firstName, user?.lastName),
      avatar: user?.avatarPhotoId!,
      isGroup: false,
      phone: user.phoneNumber,
    };
  }

  async getGlobalState() {
    return this.#db
      .table<ITgGlobalState>(this.#dbTable)
      .get(this.#globalStateKey);
  }

  async todo() {
    this.tgGlobalState = await this.getGlobalState();
    if (isEmpty(this.tgGlobalState)) {
      return;
    }

    const chats = this.tgGlobalState.chats.byId;
    let unreadCount = 0;
    forEach(chats, (chat) => {
      if (chat.unreadCount && !chat.isMuted) {
        unreadCount += chat.unreadCount;
      }
    });

    const app = appStore.getAppById(getCurrentWebviewId())!;
    if (app.unreadCount === unreadCount) {
      return;
    }
    app.unreadCount = unreadCount;
    appStore.updateAppList([app]);
    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [MainWebviewId],
        type: EChannelMessageEventType.changeAppUnreadCount,
        payload: {
          unreadCount,
        },
      }),
    );
  }
}

export const telegramIndexedDB = new TelegramIndexedDB();
