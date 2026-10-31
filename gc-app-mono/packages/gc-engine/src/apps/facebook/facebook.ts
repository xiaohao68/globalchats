import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { attachStyleSheet } from "@gc/utils";
import styles from "./styles.css?inline";
import { facebookSDK } from "./sdk";
import { startFacebookDomProbe, stopFacebookDomProbe } from "./domProbe";
import { webviewChannel, EChannelMessageEventType } from "@gc/webview";
import { MainWebviewId } from "@gc/model";
import {
  FacebookMessageWatcher,
  makeConversationKey,
  makeCustomerKey,
  makeSyntheticMessageId,
  type IWatchedConversation,
} from "./messageWatcher.ts";

class Facebook extends AbstractAppEngine {
  appSDK = facebookSDK;
  #messageWatcher?: FacebookMessageWatcher;

  constructor() {
    super();
    attachStyleSheet(styles);
  }

  async mount() {
    await super.mount();
    // 临时诊断：把 /messages 页真实 DOM 结构 dump 到 app.log（正式监听稳定后删除）
    startFacebookDomProbe();

    // ----------------------------------------------------------------
    // 客户来信监听
    //
    // 与 LinkedIn 同构：本监听器跑在 Facebook 网页内部（preload 注入），
    // 链路 = 本监听器 → webviewChannel(incomingMessage) → 宿主 Dashboard
    //        → invoke record_incoming_message_cmd → PostgreSQL → 中栏/聚合栏刷新
    //
    // ⚠️ 监听脚本活在 WebView 里：一旦该平台的 WebView 被 close，
    //    脚本连同进程一起消失，切走期间的消息全部漏掉且补不回来。
    //    所以平台必须列进 Dashboard 的 PINNED_PLATFORMS（只 hide 不 close）。
    // ----------------------------------------------------------------
    this.#messageWatcher = new FacebookMessageWatcher({
      onNewMessage: (conversation) => this.#reportIncomingMessage(conversation),
      debug: true,
    });
    this.#messageWatcher.start();
  }

  destroy() {
    super.destroy();
    stopFacebookDomProbe();
    this.#messageWatcher?.stop();
  }

  /** 把监听到的客户消息交给宿主（宿主负责补全业务员 id / 平台账号 id 后落库） */
  #reportIncomingMessage(conversation: IWatchedConversation) {
    // 客户 / 会话的外部 id 都用**名字派生的稳定键**（与 LinkedIn 一致）：
    // Facebook 的 thread id 只在 URL 和「带 href 的列表行」里有，
    // 用真实 id 做键会让「两条路线覆盖面不同」的会话分裂成两条记录。
    const conversationKey =
      makeConversationKey(conversation.customerName) || conversation.conversationExternalId;
    const customerKey =
      makeCustomerKey(conversation.customerName) || conversation.conversationExternalId;

    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [MainWebviewId],
        type: EChannelMessageEventType.incomingMessage,
        payload: {
          platform: "facebook",
          conversationExternalId: conversationKey,
          customerExternalId: customerKey,
          customerName: conversation.customerName,
          customerAvatar: conversation.customerAvatar || undefined,
          isGroup: false,
          // 消息区能合成稳定指纹 id；列表路线则用「会话键 + 内容指纹」。
          // 必须用 conversationKey 而不是可能为空的 conversationExternalId，
          // 否则合成 id 会退化成 `facebook::<hash>`，丢掉区分度。
          messageExternalId:
            conversation.messageExternalId ||
            makeSyntheticMessageId(conversationKey, conversation.fingerprint),
          content: conversation.preview,
          contentType: "text",
          senderType: "customer",
          senderName: conversation.customerName,
          // 会话列表的「· 6分钟」能折算成相对时间时用它，否则退回发现时间
          sentAt: conversation.sentAtMs
            ? new Date(conversation.sentAtMs).toISOString()
            : new Date().toISOString(),
        },
      }),
    );
  }
}

export const facebook = new Facebook();
