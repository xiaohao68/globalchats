import { moduleLoader } from "./moduleLoader";
import { createLogger } from "@gc/logger";
import type {
  IStoreMsg,
  WAMessage,
  WAHistoryMessage,
  IStoreChat,
} from "../types";

const logger = createLogger("preload", "messageCollection");

/**
 * 获取 Store.Msg
 */
export function getStoreMsg(): IStoreMsg | null {
  const collections = moduleLoader.get<{ Msg: IStoreMsg }>("WAWebCollections");
  return collections?.Msg ?? null;
}

/**
 * 监听新消息
 * WAWebCollections 可能在 hasSynced 之后才完全加载，
 * 所以如果 Store.Msg 不可用，轮询等待直到可用再注册监听器
 */
export function onNewMessage(callback: (msg: WAMessage) => void): () => void {
  const storeMsg = getStoreMsg();
  if (storeMsg) {
    logger.info("onNewMessage: Store.Msg available, registering listener");
    storeMsg.on("add", callback);
    return () => storeMsg.off("add", callback);
  }

  logger.warn("onNewMessage: Store.Msg not available yet, polling until ready...");

  let cleanup: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const POLL_INTERVAL = 2000;
  const MAX_POLL_TIME = 5 * 60_000;
  const startTime = Date.now();

  pollTimer = setInterval(() => {
    moduleLoader.clear();
    const msg = getStoreMsg();
    if (msg) {
      logger.info("onNewMessage: Store.Msg became available after polling");
      clearInterval(pollTimer!);
      pollTimer = null;
      msg.on("add", callback);
      cleanup = () => msg.off("add", callback);
    } else if (Date.now() - startTime > MAX_POLL_TIME) {
      logger.error("onNewMessage: gave up waiting for Store.Msg after 5 minutes");
      clearInterval(pollTimer!);
      pollTimer = null;
    }
  }, POLL_INTERVAL);

  return () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    cleanup?.();
  };
}

/**
 * 获取指定聊天的消息历史
 * @param chatId 聊天 ID（支持完整序列化 ID 或纯用户 ID）
 */
export function getMessagesByChatId(
  chatId: string,
): WAHistoryMessage[] | undefined {
  const collections = moduleLoader.get<{ Chat: IStoreChat }>(
    "WAWebCollections",
  );
  if (!collections?.Chat) {
    return undefined;
  }

  const chatModels = collections.Chat.getModelsArray();
  const chat = chatModels.find(
    (c) => c.id._serialized === chatId || c.id.user === chatId,
  );

  if (!chat) {
    return undefined;
  }

  // @ts-expect-error msgs 是 WhatsApp Web 内部属性
  const msgs = chat.msgs?._models as WAHistoryMessage[] | undefined;
  return msgs;
}

/**
 * 加载指定聊天的更多历史消息
 * @param chatId 聊天 ID
 * @param count 要加载的消息数量（默认 50）
 * @returns 加载后的所有消息
 */
export async function loadEarlierMessages(
  chatId: string,
  count: number = 50,
): Promise<WAHistoryMessage[]> {
  const collections = moduleLoader.get<{ Chat: IStoreChat }>(
    "WAWebCollections",
  );
  if (!collections?.Chat) {
    logger.warn("loadEarlierMessages: Chat collection not available");
    return [];
  }

  const chatModels = collections.Chat.getModelsArray();
  const chat = chatModels.find(
    (c) => c.id._serialized === chatId || c.id.user === chatId,
  );

  if (!chat) {
    logger.warn("loadEarlierMessages: chat not found", { chatId });
    return [];
  }

  // 获取对象及其原型链上的所有方法
  const getAllMethods = (obj: object): string[] => {
    const methods: string[] = [];
    let current = obj;
    while (current && current !== Object.prototype) {
      const names = Object.getOwnPropertyNames(current);
      for (const name of names) {
        try {
          // @ts-expect-error 动态访问属性
          if (typeof current[name] === "function" && !methods.includes(name)) {
            methods.push(name);
          }
        } catch {
          // 忽略访问错误
        }
      }
      current = Object.getPrototypeOf(current);
    }
    return methods;
  };

  // @ts-expect-error 访问内部属性
  const chatMethods = getAllMethods(chat);
  // @ts-expect-error 访问内部属性
  const msgsMethods = chat.msgs ? getAllMethods(chat.msgs) : [];

  // 过滤出可能与消息加载相关的方法
  const relevantMethods = chatMethods.filter(m =>
    m.toLowerCase().includes("msg") ||
    m.toLowerCase().includes("load") ||
    m.toLowerCase().includes("fetch") ||
    m.toLowerCase().includes("earlier") ||
    m.toLowerCase().includes("history")
  );
  const relevantMsgsMethods = msgsMethods.filter(m =>
    m.toLowerCase().includes("load") ||
    m.toLowerCase().includes("fetch") ||
    m.toLowerCase().includes("earlier")
  );

  // 检查 chat.msgs 是否有 loadEarlierMsgs 方法
  // @ts-expect-error 访问内部属性
  const hasChatMsgsLoadEarlier = typeof chat.msgs?.loadEarlierMsgs === "function";
  // @ts-expect-error 访问内部属性
  const chatMsgsMethods = chat.msgs ? getAllMethods(chat.msgs) : [];

  // 打印所有方法，帮助调试
  logger.info("loadEarlierMessages: all chat methods", {
    chatId,
    allMethods: chatMethods.sort(),
    chatMsgsMethods: chatMsgsMethods.slice(0, 50), // 只显示前50个方法
  });

  logger.info("loadEarlierMessages: available methods", {
    chatId,
    relevantChatMethods: relevantMethods,
    relevantMsgsMethods: relevantMsgsMethods,
    totalChatMethods: chatMethods.length,
    totalMsgsMethods: msgsMethods.length,
    hasChatMsgsLoadEarlier,
  });

  try {
    // 尝试使用 Store.ConversationMsgs.loadEarlierMsgs (whatsapp-web.js 的方法)
    // @ts-expect-error 访问 WhatsApp Web 内部 Store
    const Store = window.Store;

    // 调试 Store 状态 - 详细检查 Msg 和 Chat 的所有方法
    const msgMethods = Store?.Msg ? getAllMethods(Store.Msg) : [];
    const chatStoreMethods = Store?.Chat ? getAllMethods(Store.Chat) : [];

    logger.info("loadEarlierMessages: Store check", {
      chatId,
      hasStore: !!Store,
      hasConversationMsgs: !!Store?.ConversationMsgs,
      hasLoadEarlierMsgs: !!Store?.ConversationMsgs?.loadEarlierMsgs,
      hasMsgLoadEarlier: !!Store?.Msg?.loadEarlierMsgs,
      hasChatLoadEarlier: !!Store?.Chat?.loadEarlierMsgs,
      storeKeys: Store ? Object.keys(Store).slice(0, 30) : [],
      msgMethods: msgMethods.filter(m => m.toLowerCase().includes('msg') || m.toLowerCase().includes('load') || m.toLowerCase().includes('fetch') || m.toLowerCase().includes('sync')),
      chatStoreMethods: chatStoreMethods.filter(m => m.toLowerCase().includes('msg') || m.toLowerCase().includes('load') || m.toLowerCase().includes('fetch') || m.toLowerCase().includes('sync')),
    });

    // 检查 Store.Msg 或 Store.Chat 是否有 loadEarlierMsgs 方法
    if (Store?.Msg?.loadEarlierMsgs) {
      logger.info("loadEarlierMessages: using Store.Msg.loadEarlierMsgs", { chatId });

      // @ts-expect-error msgs 是 WhatsApp Web 内部属性
      let msgs = chat.msgs?.getModelsArray() || [];

      // 循环加载直到达到目标数量或没有更多消息
      while (msgs.length < count) {
        // @ts-expect-error loadEarlierMsgs 是 WhatsApp Web 内部方法
        const loadedMessages = await Store.Msg.loadEarlierMsgs(chat, chat.msgs);
        if (!loadedMessages || !loadedMessages.length) {
          logger.info("loadEarlierMessages: no more messages to load", { chatId, currentCount: msgs.length });
          break;
        }
        // @ts-expect-error msgs 是 WhatsApp Web 内部属性
        msgs = chat.msgs?.getModelsArray() || [];
        logger.info("loadEarlierMessages: loaded batch", { chatId, loadedCount: loadedMessages.length, totalCount: msgs.length });
      }

      logger.info("loadEarlierMessages: Store.Msg result", { chatId, messageCount: msgs.length });
      return msgs.slice(-count) as WAHistoryMessage[];
    }

    if (Store?.ConversationMsgs?.loadEarlierMsgs) {
      logger.info("loadEarlierMessages: using Store.ConversationMsgs.loadEarlierMsgs", { chatId });

      // @ts-expect-error msgs 是 WhatsApp Web 内部属性
      let msgs = chat.msgs?.getModelsArray() || [];

      // 循环加载直到达到目标数量或没有更多消息
      while (msgs.length < count) {
        // @ts-expect-error loadEarlierMsgs 是 WhatsApp Web 内部方法
        const loadedMessages = await Store.ConversationMsgs.loadEarlierMsgs(chat, chat.msgs);
        if (!loadedMessages || !loadedMessages.length) {
          logger.info("loadEarlierMessages: no more messages to load", { chatId, currentCount: msgs.length });
          break;
        }
        // @ts-expect-error msgs 是 WhatsApp Web 内部属性
        msgs = chat.msgs?.getModelsArray() || [];
        logger.info("loadEarlierMessages: loaded batch", { chatId, loadedCount: loadedMessages.length, totalCount: msgs.length });
      }

      logger.info("loadEarlierMessages: Store.ConversationMsgs result", { chatId, messageCount: msgs.length });
      return msgs.slice(-count) as WAHistoryMessage[];
    }

    // 尝试使用 getAllMsgs 方法获取所有消息
    // @ts-expect-error getAllMsgs 是 WhatsApp Web 内部方法
    if (typeof chat.getAllMsgs === "function") {
      logger.info("loadEarlierMessages: using getAllMsgs", { chatId });
      // @ts-expect-error getAllMsgs 是 WhatsApp Web 内部方法
      const allMsgs = await chat.getAllMsgs();
      if (allMsgs && Array.isArray(allMsgs)) {
        logger.info("loadEarlierMessages: getAllMsgs result", { chatId, messageCount: allMsgs.length });
        return allMsgs.slice(-count) as WAHistoryMessage[];
      }
    }

    // 尝试使用 preload 方法预加载消息
    // @ts-expect-error preload 是 WhatsApp Web 内部方法
    if (typeof chat.preload === "function") {
      logger.info("loadEarlierMessages: using preload", { chatId });
      try {
        // @ts-expect-error preload 是 WhatsApp Web 内部方法
        await chat.preload();
        logger.info("loadEarlierMessages: preload completed", { chatId });
      } catch (preloadError) {
        logger.warn("loadEarlierMessages: preload failed", { chatId, error: String(preloadError) });
      }
    }

    // 尝试使用 waitForChatLoading 等待聊天加载
    // @ts-expect-error waitForChatLoading 是 WhatsApp Web 内部方法
    if (typeof chat.waitForChatLoading === "function") {
      logger.info("loadEarlierMessages: using waitForChatLoading", { chatId });
      try {
        // @ts-expect-error waitForChatLoading 是 WhatsApp Web 内部方法
        await chat.waitForChatLoading();
        logger.info("loadEarlierMessages: waitForChatLoading completed", { chatId });
      } catch (waitError) {
        logger.warn("loadEarlierMessages: waitForChatLoading failed", { chatId, error: String(waitError) });
      }
    }

    // 尝试使用 msgs 的 onMsgLoadStateChange 来监听加载状态
    // @ts-expect-error onMsgLoadStateChange 是 WhatsApp Web 内部方法
    if (chat.msgs && typeof chat.msgs.onMsgLoadStateChange === "function") {
      logger.info("loadEarlierMessages: setting up onMsgLoadStateChange listener", { chatId });

      // 设置一个 Promise 来等待消息加载
      const waitForMsgLoad = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          logger.info("loadEarlierMessages: msg load wait timeout", { chatId });
          resolve();
        }, 3000); // 最多等待3秒

        // @ts-expect-error onMsgLoadStateChange 是 WhatsApp Web 内部方法
        chat.msgs.onMsgLoadStateChange((state: string) => {
          logger.info("loadEarlierMessages: msg load state changed", { chatId, state });
          if (state === "complete" || state === "loaded") {
            clearTimeout(timeout);
            resolve();
          }
        });
      });

      await waitForMsgLoad;
    }

    // 尝试多种可能的方法名
    // @ts-expect-error loadEarlierMsgs 是 WhatsApp Web 内部方法
    if (typeof chat.loadEarlierMsgs === "function") {
      logger.info("loadEarlierMessages: using loadEarlierMsgs", { chatId, count });
      try {
        // @ts-expect-error loadEarlierMsgs 是 WhatsApp Web 内部方法
        await chat.loadEarlierMsgs(count);
      } catch (e) {
        logger.warn("loadEarlierMessages: loadEarlierMsgs failed", { chatId, error: String(e) });
      }
    // @ts-expect-error fetchEarlierMsgs 是 WhatsApp Web 内部方法
    } else if (typeof chat.fetchEarlierMsgs === "function") {
      logger.info("loadEarlierMessages: using fetchEarlierMsgs", { chatId, count });
      try {
        // @ts-expect-error fetchEarlierMsgs 是 WhatsApp Web 内部方法
        await chat.fetchEarlierMsgs(count);
      } catch (e) {
        logger.warn("loadEarlierMessages: fetchEarlierMsgs failed", { chatId, error: String(e) });
      }
    // @ts-expect-error msgs.loadEarlierMsgs 是 WhatsApp Web 内部方法
    } else if (chat.msgs && typeof chat.msgs.loadEarlierMsgs === "function") {
      logger.info("loadEarlierMessages: using msgs.loadEarlierMsgs", { chatId, count });
      try {
        // @ts-expect-error msgs.loadEarlierMsgs 是 WhatsApp Web 内部方法
        await chat.msgs.loadEarlierMsgs(count);
      } catch (e) {
        logger.warn("loadEarlierMessages: msgs.loadEarlierMsgs failed", { chatId, error: String(e) });
      }
    } else {
      logger.warn("loadEarlierMessages: no traditional load method available, tried preload + wait", { chatId });
    }

    // 检查是否还有更多特定类型的消息获取方法
    // @ts-expect-error getStarredMsgs 是 WhatsApp Web 内部方法
    if (typeof chat.getStarredMsgs === "function") {
      logger.info("loadEarlierMessages: checking getStarredMsgs", { chatId });
      try {
        // @ts-expect-error getStarredMsgs 是 WhatsApp Web 内部方法
        const starredMsgs = await chat.getStarredMsgs();
        logger.info("loadEarlierMessages: getStarredMsgs result", { chatId, count: starredMsgs?.length ?? 0 });
      } catch (e) {
        // 忽略错误
      }
    }

    // 尝试通过触发滚动事件来加载更多消息（模拟用户滚动）
    logger.info("loadEarlierMessages: attempting to trigger message load via DOM", { chatId });
    try {
      // 查找聊天相关的 DOM 元素并尝试触发滚动
      const chatElements = document.querySelectorAll('[data-testid="conversation-panel"]');
      if (chatElements.length > 0) {
        const panel = chatElements[0];
        // 滚动到顶部以触发历史消息加载
        panel.scrollTop = 0;
        logger.info("loadEarlierMessages: triggered scroll on conversation panel", { chatId });

        // 等待一段时间让消息加载
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (scrollError) {
      logger.warn("loadEarlierMessages: scroll trigger failed", { chatId, error: String(scrollError) });
    }

  } catch (error) {
    logger.error("loadEarlierMessages: failed to load", { chatId, error: String(error) });
  }

  // 最后再次尝试 getAllMsgs 获取所有可用的消息
  try {
    // @ts-expect-error getAllMsgs 是 WhatsApp Web 内部方法
    if (typeof chat.getAllMsgs === "function") {
      logger.info("loadEarlierMessages: final getAllMsgs call", { chatId });
      // @ts-expect-error getAllMsgs 是 WhatsApp Web 内部方法
      const allMsgs = await chat.getAllMsgs();
      if (allMsgs && Array.isArray(allMsgs)) {
        logger.info("loadEarlierMessages: final getAllMsgs result", { chatId, messageCount: allMsgs.length });
        return allMsgs.slice(-count) as WAHistoryMessage[];
      }
    }
  } catch (e) {
    logger.warn("loadEarlierMessages: final getAllMsgs failed", { chatId, error: String(e) });
  }

  // @ts-expect-error msgs 是 WhatsApp Web 内部属性
  const msgs = chat.msgs?._models as WAHistoryMessage[] | undefined;
  logger.info("loadEarlierMessages: result", { chatId, messageCount: msgs?.length ?? 0 });
  return msgs ?? [];
}

/**
 * 初始化 Message 相关模块
 */
export function initMessageModules(): {
  storeMsg: IStoreMsg | null;
} {
  return {
    storeMsg: getStoreMsg(),
  };
}
