import type {
  AppState,
  ELoadingStatus,
  ERouterPath,
  IChatUserConfig,
  IGlobalSetting,
  IGlobalStore,
  IThirdAppConfig,
  IThirdAppUserInfo,
} from "@gc/model";
import mitt from "mitt";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { noop } from "lodash-es";
import { domReady, getCurrentWebviewId, type Nullable } from "@gc/utils";

export enum EChannelMessageEventType {
  loadingProgress = "loadingProgress",
  navigate = "navigate",
  //-------------------------------------------------------------------------------------
  // app setting
  //-------------------------------------------------------------------------------------
  changeAppChatUserConfig = "changeAppChatUserConfig",
  changeAppUnreadCount = "changeAppUnreadCount",
  changeAppUserInfo = "changeAppUserInfo",
  changeAppCurrentChatUser = "changeAppCurrentChatUser",
  changeChatUserConfigList = "changeChatUserConfigList",

  //-------------------------------------------------------------------------------------
  // 实时监听：注入脚本抓到平台上的客户新消息后，通过这个事件交给宿主
  //-------------------------------------------------------------------------------------
  incomingMessage = "incomingMessage",

  //-------------------------------------------------------------------------------------
  // 实时监听：注入脚本发现「当前页面根本监听不了」（2026-10-21 新增）
  //
  // 为什么不复用 Rust 侧的 PlatformNeedRelogin 事件：
  //   Rust 靠 `on_navigation` 判断 URL，但**跨域重定向不触发**。
  //   实测 LinkedIn 登录失效后会跳到 accounts.google.com/signIn（走 Google 登录），
  //   这个重定向 on_navigation 抓不到，于是红条永远不出现。
  //   而注入脚本是按 DOM/URL 周期性自检的（每 8 秒一次），它一定能发现，
  //   所以由它直接告诉界面最可靠。
  //-------------------------------------------------------------------------------------
  watcherAlert = "watcherAlert",

  //-------------------------------------------------------------------------------------
  // 通用的
  //-------------------------------------------------------------------------------------
  updateSettings = "updateSettings",
  // app state
  changeCurrentApp = "changeCurrentApp",
  logout = "logout",

  requestStoreState = "requestStoreState",
  refreshStoreState = "refreshStoreState",
  sendStoreState = "sendStoreState",
}

/**
 * 注入脚本监听到的一条客户消息。
 *
 * 只包含「平台网页里能拿到的信息」——登录用户 id、平台账号 id 这类
 * 数据库侧概念由宿主（main webview）收到后补全，注入脚本不掺和。
 */
export interface IIncomingMessage {
  /** 平台标识：telegram / tiktok / linkedin / messenger / facebook / teams */
  platform: string;
  /** 会话在平台侧的 id（LinkedIn 就是 URL 里的 thread id） */
  conversationExternalId: string;
  /** 对方（客户）在平台侧的 id */
  customerExternalId: string;
  /** 对方显示名 */
  customerName?: string;
  customerAvatar?: string;
  isGroup?: boolean;
  /**
   * 平台侧消息 id。
   * 某些平台的 DOM 不带消息 id，注入脚本会按「会话 id + 时间 + 正文」
   * 合成一个稳定值 —— 只要同一会话里内容不同就是不同条目，足够做幂等去重。
   */
  messageExternalId: string;
  content?: string;
  contentType?: string;
  /** customer / agent / system */
  senderType?: string;
  senderName?: string;
  /** 平台侧发送时间（ISO8601） */
  sentAt?: string;
}

interface IChannelMessagePayload {
  [EChannelMessageEventType.loadingProgress]: {
    status: ELoadingStatus;
  };
  [EChannelMessageEventType.navigate]: {
    path: ERouterPath;
  };
  //-------------------------------------------------------------------------------------
  // app setting
  //-------------------------------------------------------------------------------------
  [EChannelMessageEventType.changeAppChatUserConfig]: {
    appId: string;
    userId: string;
    chatUserConfig: Nullable<IChatUserConfig>;
  };
  [EChannelMessageEventType.changeAppUnreadCount]: {
    unreadCount: AppState["unreadCount"];
  };
  [EChannelMessageEventType.changeAppUserInfo]: {
    userInfo: IThirdAppUserInfo;
  };
  [EChannelMessageEventType.changeAppCurrentChatUser]: {
    userInfo: IThirdAppUserInfo;
  };
  [EChannelMessageEventType.changeChatUserConfigList]: {
    chatUserConfigList: Record<string, IChatUserConfig>;
  };
  //-------------------------------------------------------------------------------------
  // 实时监听
  //-------------------------------------------------------------------------------------
  [EChannelMessageEventType.incomingMessage]: IIncomingMessage;

  [EChannelMessageEventType.watcherAlert]: {
    /** 哪个平台：linkedin / facebook / tiktok … */
    platform: string;
    /** 当前停在哪（用于提示与排障） */
    url: string;
    /** 一句话原因，直接显示给业务员 */
    reason: string;
  };
  //-------------------------------------------------------------------------------------
  // 通用的
  //-------------------------------------------------------------------------------------
  [EChannelMessageEventType.updateSettings]: {
    appId?: string;
    globalSetting?: IGlobalSetting;
    thirdAppConfig?: IThirdAppConfig;
  };
  //-------------------------------------------------------------------------------------
  // app state
  //-------------------------------------------------------------------------------------
  [EChannelMessageEventType.changeCurrentApp]: {
    app: Nullable<AppState>;
  };
  [EChannelMessageEventType.logout]: {};

  [EChannelMessageEventType.requestStoreState]: {};
  [EChannelMessageEventType.refreshStoreState]: {};

  [EChannelMessageEventType.sendStoreState]: {
    globalStore: IGlobalStore;
  };
}

export interface ChannelMessage<
  K extends EChannelMessageEventType = EChannelMessageEventType,
> {
  senderId: string;
  receiverIds: string[];
  type: K;
  payload: IChannelMessagePayload[K];
}

type ChannelMessageRecord = {
  [K in EChannelMessageEventType]: ChannelMessage<K>;
};

export class WebviewChannel {
  channelId!: string;
  readonly emitter = mitt<ChannelMessageRecord>();
  #unListenFn: UnlistenFn = noop;
  #mounted = false;

  async mount<K extends EChannelMessageEventType = EChannelMessageEventType>() {
    if (this.#mounted) {
      console.warn("WebviewChannel.mount() 已调用过，跳过重复挂载");
      return;
    }
    this.#mounted = true;

    await domReady();
    this.channelId = getCurrentWebviewId();
    this.#unListenFn = await listen<ChannelMessageRecord[K]>(
      WebviewChannel.name,
      (event) => {
        const { senderId, receiverIds, type } = event.payload;
        if (this.#shouldNotifyMe(senderId, receiverIds)) {
          console.debug("WebviewChannel received message: ", type, event.payload);
          this.emitter.emit(type, event.payload);
        }
      },
    );
  }

  destroy() {
    this.#unListenFn();
    this.emitter.all.clear();
    this.#mounted = false;
  }

  #shouldNotifyMe(senderId: string, receiverIds: string[]) {
    if (this.isSelfSender(senderId)) {
      return false;
    }
    return receiverIds.some((receiverId) => {
      if (receiverId === "*") {
        return true;
      }
      return receiverId === this.channelId;
    });
  }

  createMessage<K extends EChannelMessageEventType = EChannelMessageEventType>(
    message: Omit<ChannelMessage<K>, "senderId">,
  ): ChannelMessage<K> {
    return {
      senderId: this.channelId,
      receiverIds: message.receiverIds,
      type: message.type,
      payload: message.payload,
    };
  }

  async sendMessage<
    K extends EChannelMessageEventType = EChannelMessageEventType,
  >(message: Omit<ChannelMessage<K>, "senderId">) {
    console.debug("WebviewChannel sendMessage:", message);
    await emit(WebviewChannel.name, this.createMessage(message));
  }

  isSelfSender(senderId: string) {
    return senderId === this.channelId;
  }
}

export const webviewChannel = new WebviewChannel();

