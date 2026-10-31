import {
  apiImtpWhatsappConnectionAccounts,
  apiImtpWhatsappConnectionConversations,
  apiImtpWhatsappConnectionMessages,
  apiImtpWhatsappConnectionParticipants,
} from "@gc/api";
import type {
  ImtpWhatsAppAccountEdge,
  ImtpWhatsappAccount,
  ImtpWhatsappConversation,
  ImtpWhatsappMessage,
  ImtpWhatsappParticipant,
  ImtpWhatsAppConversationEdge,
  ImtpWhatsAppMessageEdge,
  ImtpWhatsAppParticipantEdge,
} from "@gc/api/gen/graphql";
import { createLogger } from "@gc/logger";
import { EPlatform } from "@gc/model";
import { useChatStore } from "../store/chatStore";
import { useSyncStore } from "../store/syncStore";
import type { Account } from "../types";

const logger = createLogger("aggregated-chat", "sync-engine");

export class SyncEngine {
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly POLL_INTERVAL = 5000;

  private conversationCursors = new Map<string, string>();
  private participantCursors = new Map<string, string>();
  private messageCursors = new Map<string, string>();

  async initialLoad(): Promise<void> {
    logger.info("Starting initial load (Connection mode)");

    const accountsResult = await apiImtpWhatsappConnectionAccounts({
      first: 50,
    });
    const edges = accountsResult.edges ?? [];
    logger.info("Loaded accounts", {
      count: edges.length,
      total: accountsResult.totalCount,
    });

    if (edges.length === 0) {
      logger.warn("No accounts found");
      return;
    }

    const accounts: Account[] = edges.map((e) =>
      this.toAccount(this.mapAccountEdge(e)),
    );
    useChatStore.getState().setAccounts(accounts);

    for (const edge of edges) {
      const accountId = edge.nodeId;

      const convResult = await apiImtpWhatsappConnectionConversations({
        accountId,
        first: 100,
      });
      if (convResult.edges.length > 0) {
        useChatStore.getState().mergeImtpConversations({
          accountId,
          conversations: convResult.edges.map((e) =>
            this.mapConversationEdge(e),
          ),
        });
      }
      if (convResult.pageInfo.endCursor) {
        this.conversationCursors.set(
          accountId,
          convResult.pageInfo.endCursor,
        );
      }

      const partResult = await apiImtpWhatsappConnectionParticipants({
        accountId,
        first: 100,
      });
      if (partResult.edges.length > 0) {
        useChatStore.getState().mergeImtpParticipants({
          accountId,
          participants: partResult.edges.map((e) =>
            this.mapParticipantEdge(e),
          ),
        });
      }
      if (partResult.pageInfo.endCursor) {
        this.participantCursors.set(accountId, partResult.pageInfo.endCursor);
      }

      const loadedConversations = useChatStore
        .getState()
        .conversations.filter((c) => c.accountId === accountId);
      for (const conv of loadedConversations) {
        const conversationId = this.extractConversationId(conv.id);
        const msgResult = await apiImtpWhatsappConnectionMessages({
          accountId,
          conversationId,
          first: 50,
        });
        if (msgResult.edges.length > 0) {
          useChatStore.getState().mergeImtpMessages({
            accountId,
            messages: msgResult.edges.map((e) => this.mapMessageEdge(e)),
          });
        }
        if (msgResult.pageInfo.endCursor) {
          this.messageCursors.set(
            conversationId,
            msgResult.pageInfo.endCursor,
          );
        }
      }
    }

    this.retryCount = 0;
    useSyncStore.getState().setLastSyncAt(Date.now());
    logger.info("Initial load completed");
  }

  startPolling(): void {
    if (this.pollTimer) return;

    useSyncStore.getState().setIsPolling(true);
    logger.info("Polling started", { interval: this.POLL_INTERVAL });
    this.scheduleNextPoll(0);
  }

  stopPolling(): void {
    if (!this.pollTimer) return;

    clearTimeout(this.pollTimer);
    this.pollTimer = null;
    useSyncStore.getState().setIsPolling(false);
    logger.info("Polling stopped");
  }

  private scheduleNextPoll(delay: number): void {
    this.pollTimer = setTimeout(async () => {
      try {
        await this.poll();
        this.retryCount = 0;
        useSyncStore.getState().setLastSyncAt(Date.now());
        useSyncStore.getState().setError(null);

        if (this.pollTimer !== null) {
          this.scheduleNextPoll(this.POLL_INTERVAL);
        }
      } catch (error) {
        this.handleError(error);
      }
    }, delay);
  }

  private async poll(): Promise<void> {
    const { accounts, conversations } = useChatStore.getState();

    if (accounts.length === 0) {
      logger.debug("poll: no accounts, skipping");
      return;
    }

    for (const account of accounts) {
      const accountId = account.id;

      const convResult = await apiImtpWhatsappConnectionConversations({
        accountId,
        first: 100,
        ...(this.conversationCursors.has(accountId)
          ? { after: this.conversationCursors.get(accountId) }
          : {}),
      });
      if (convResult.edges.length > 0) {
        useChatStore.getState().mergeImtpConversations({
          accountId,
          conversations: convResult.edges.map((e) =>
            this.mapConversationEdge(e),
          ),
        });
      }
      if (convResult.pageInfo.endCursor) {
        this.conversationCursors.set(
          accountId,
          convResult.pageInfo.endCursor,
        );
      }

      const partResult = await apiImtpWhatsappConnectionParticipants({
        accountId,
        first: 100,
        ...(this.participantCursors.has(accountId)
          ? { after: this.participantCursors.get(accountId) }
          : {}),
      });
      if (partResult.edges.length > 0) {
        useChatStore.getState().mergeImtpParticipants({
          accountId,
          participants: partResult.edges.map((e) =>
            this.mapParticipantEdge(e),
          ),
        });
      }
      if (partResult.pageInfo.endCursor) {
        this.participantCursors.set(accountId, partResult.pageInfo.endCursor);
      }

      const accountConversations = conversations.filter(
        (c) => c.accountId === accountId,
      );
      for (const conv of accountConversations) {
        const conversationId = this.extractConversationId(conv.id);

        const msgResult = await apiImtpWhatsappConnectionMessages({
          accountId,
          conversationId,
          first: 50,
          ...(this.messageCursors.has(conversationId)
            ? { after: this.messageCursors.get(conversationId) }
            : {}),
        });
        if (msgResult.edges.length > 0) {
          useChatStore.getState().mergeImtpMessages({
            accountId,
            messages: msgResult.edges.map((e) => this.mapMessageEdge(e)),
          });
        }
        if (msgResult.pageInfo.endCursor) {
          this.messageCursors.set(
            conversationId,
            msgResult.pageInfo.endCursor,
          );
        }
      }
    }
  }

  private handleError(error: unknown): void {
    this.retryCount++;
    logger.error("Poll failed", {
      error: String(error),
      retryCount: this.retryCount,
    });

    if (this.retryCount > this.MAX_RETRIES) {
      useSyncStore.getState().setError("同步失败，请检查网络连接");
      this.pollTimer = null;
      return;
    }

    const backoffDelay = Math.pow(2, this.retryCount - 1) * 1000;
    this.scheduleNextPoll(backoffDelay);
  }

  private extractConversationId(compositeId: string): string {
    const idx = compositeId.indexOf(":");
    return idx >= 0 ? compositeId.slice(idx + 1) : compositeId;
  }

  private mapAccountEdge(edge: ImtpWhatsAppAccountEdge): ImtpWhatsappAccount {
    return {
      id: edge.nodeId,
      jid: edge.jid,
      lid: edge.lid,
      hijackImUserId: edge.hijackImUserId,
      assignImUserId: edge.assignImUserId,
      data: edge.data,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }

  private mapConversationEdge(
    edge: ImtpWhatsAppConversationEdge,
  ): ImtpWhatsappConversation {
    return {
      id: edge.nodeId,
      jid: edge.jid,
      imtpWhatsappAccountId: edge.imtpWhatsappAccountId,
      data: edge.data,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }

  private mapMessageEdge(edge: ImtpWhatsAppMessageEdge): ImtpWhatsappMessage {
    return {
      id: edge.nodeId,
      messageId: edge.messageId,
      fromMe: edge.fromMe,
      remoteJid: edge.remoteJid,
      participant: edge.participant,
      participantAlt: edge.participantAlt,
      imtpWhatsappAccountId: edge.imtpWhatsappAccountId,
      imtpWhatsappConversationId: edge.imtpWhatsappConversationId,
      data: edge.data,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }

  private mapParticipantEdge(
    edge: ImtpWhatsAppParticipantEdge,
  ): ImtpWhatsappParticipant {
    return {
      id: edge.nodeId,
      jid: edge.jid,
      lid: edge.lid,
      imtpWhatsappAccountId: edge.imtpWhatsappAccountId,
      data: edge.data,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }

  private toAccount(account: ImtpWhatsappAccount): Account {
    const data = (account.data || {}) as Record<string, any>;
    const jid = account.jid;
    return {
      id: account.id,
      platform: EPlatform.Whatsapp,
      name:
        data.name || data.pushName || (jid && jid.split("@")[0]) || "WhatsApp",
      avatar: data.avatar,
      isActive: true,
    };
  }
}

export const syncEngine = new SyncEngine();
