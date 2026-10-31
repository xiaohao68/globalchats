import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { linkedinSDK } from "./sdk";
import { ESDKEventType } from "../engine/sdk/SDKEvent.ts";
import { appStore } from "@gc/store";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { MainWebviewId } from "@gc/model";
import { isEmpty, isEqual, throttle } from "lodash-es";
import {
  LinkedInMessageWatcher,
  makeConversationKey,
  makeCustomerKey,
  makeSyntheticMessageId,
  type IWatchedConversation,
} from "./messageWatcher.ts";

class Linkedin extends AbstractAppEngine {
  appSDK = linkedinSDK;
  #chatChangeObserver?: MutationObserver;
  #messageWatcher?: LinkedInMessageWatcher;

  async mount() {
    await super.mount();
    this.#chatChangeObserver = new MutationObserver(
      throttle(() => this.#checkChatChange(), 100),
    );
    this.#chatChangeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ----------------------------------------------------------------
    // 客户来信监听
    //
    // 观察的是「会话列表」，不是当前打开的对话 —— 这样客户给任意一个
    // 会话发消息，即使业务员没点开，也能被捕获并汇总进聚合消息栏。
    //
    // 链路：本监听器 → webviewChannel(incomingMessage) → 宿主 main webview
    //       → invoke record_incoming_message_cmd → PostgreSQL → 聚合栏刷新
    // ----------------------------------------------------------------
    this.#messageWatcher = new LinkedInMessageWatcher({
      onNewMessage: (conversation) => this.#reportIncomingMessage(conversation),
      debug: true,
    });
    this.#messageWatcher.start();
  }

  destroy() {
    super.destroy();
    this.#chatChangeObserver?.disconnect();
    this.#messageWatcher?.stop();
  }

  /** 把监听到的客户消息交给宿主（宿主负责补全业务员 id / 平台账号 id 后落库） */
  #reportIncomingMessage(conversation: IWatchedConversation) {
    // 会话 / 客户的外部 id 都用**名字派生的稳定键**：
    // LinkedIn 的 thread id 只在会话页 URL 里出现、画像 id 只在消息气泡里出现，
    // 任一「更真实」的 id 都会因为两条路线覆盖面不同而把同一个人拆成两条记录。
    // （详见 messageWatcher.ts 头部注释）
    const conversationKey =
      makeConversationKey(conversation.customerName) || conversation.conversationExternalId;
    const customerKey =
      makeCustomerKey(conversation.customerName) || conversation.conversationExternalId;

    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [MainWebviewId],
        type: EChannelMessageEventType.incomingMessage,
        payload: {
          platform: "linkedin",
          conversationExternalId: conversationKey,
          customerExternalId: customerKey,
          customerName: conversation.customerName,
          customerAvatar: conversation.customerAvatar || undefined,
          isGroup: false,
          // 会话页能拿到真实消息 id（urn:li:msg_message:(...)，取逗号后那段）；
          // 拿不到（只在会话列表路线）才用「会话键 + 内容指纹」合成一个稳定值做幂等。
          // 这里必须用 conversationKey 而不是可能为空的 conversationExternalId，
          // 否则合成 id 会退化成 `linkedin::<hash>`，丢掉区分度。
          messageExternalId:
            conversation.messageExternalId ||
            makeSyntheticMessageId(conversationKey, conversation.fingerprint),
          content: conversation.preview,
          contentType: "text",
          senderType: "customer",
          senderName: conversation.customerName,
          // 消息 id 里能解出**真实发送时间**（毫秒）时就用它；
          // 解不出（合成 id）才退回「发现时间」—— 至少不会把时间写成未来。
          sentAt: conversation.sentAtMs
            ? new Date(conversation.sentAtMs).toISOString()
            : new Date().toISOString(),
        },
      }),
    );
  }

  #checkChatChange() {
    const currentChatUser = appStore.getCurrentChatUserByAppId();
    const currentChatUserId = this.appSDK.currentChatUserId;

    if (isEmpty(currentChatUserId)) {
      return;
    }

    if (isEqual(currentChatUserId, currentChatUser?.id)) {
      return;
    }

    this.appSDK.emitter.emit(ESDKEventType.changeCurrentChatUser, {
      payload: {
        user: this.appSDK.getCurrentChatUserInfo(currentChatUserId)!,
      },
    });
  }
}

export const linkedin = new Linkedin();
