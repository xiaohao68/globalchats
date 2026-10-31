import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  apiImtpWhatsappConnectionAccounts,
  apiImtpWhatsappConnectionConversations,
  apiImtpWhatsappConnectionMessages,
  apiImtpWhatsappConnectionParticipants,
} from "@gc/api";
import { SyncEngine } from "../SyncEngine";

const EPlatformWhatsApp = "WhatsApp";

vi.mock("@gc/api", () => ({
  apiImtpWhatsappConnectionAccounts: vi.fn(),
  apiImtpWhatsappConnectionConversations: vi.fn(),
  apiImtpWhatsappConnectionMessages: vi.fn(),
  apiImtpWhatsappConnectionParticipants: vi.fn(),
}));

vi.mock("@gc/model", () => ({
  EPlatform: {
    Whatsapp: "WhatsApp",
    Telegram: "Telegram",
    Instagram: "Instagram",
    Messenger: "Messenger",
    Facebook: "Facebook",
    Tiktok: "Tiktok",
    Linkedin: "Linkedin",
    Teams: "Teams",
  },
}));

vi.mock("@gc/logger", () => ({
  createLogger: () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockChatStore = {
  accounts: [] as any[],
  conversations: [] as any[],
  setAccounts: vi.fn(),
  mergeImtpConversations: vi.fn(),
  mergeImtpMessages: vi.fn(),
  mergeImtpParticipants: vi.fn(),
};

vi.mock("../../store/chatStore", () => ({
  useChatStore: {
    getState: () => mockChatStore,
  },
}));

const mockSyncStore = {
  setIsPolling: vi.fn(),
  setLastSyncAt: vi.fn(),
  setError: vi.fn(),
};

vi.mock("../../store/syncStore", () => ({
  useSyncStore: {
    getState: () => mockSyncStore,
  },
}));

const mockConnectionAccounts = vi.mocked(apiImtpWhatsappConnectionAccounts);
const mockConnectionConversations = vi.mocked(
  apiImtpWhatsappConnectionConversations,
);
const mockConnectionMessages = vi.mocked(apiImtpWhatsappConnectionMessages);
const mockConnectionParticipants = vi.mocked(
  apiImtpWhatsappConnectionParticipants,
);

const emptyPageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  endCursor: null,
  startCursor: null,
};

function createAccountEdge(
  nodeId: string,
  jid = `${nodeId}@s.whatsapp.net`,
  data: Record<string, any> = { name: `Account ${nodeId}` },
) {
  return {
    nodeId,
    jid,
    lid: "",
    hijackImUserId: "",
    assignImUserId: "",
    cursor: nodeId,
    data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function emptyConnectionResult() {
  return {
    edges: [],
    totalCount: 0,
    pageInfo: { ...emptyPageInfo },
  } as any;
}

describe("SyncEngine", () => {
  let engine: SyncEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    engine = new SyncEngine();
    mockChatStore.accounts = [];
    mockChatStore.conversations = [];
  });

  afterEach(() => {
    engine.stopPolling();
    vi.useRealTimers();
  });

  describe("initialLoad", () => {
    it("should load accounts and initialize cursors", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      expect(mockConnectionAccounts).toHaveBeenCalledWith({ first: 50 });
      expect(mockChatStore.setAccounts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "acc-1",
          name: "Account acc-1",
          platform: EPlatformWhatsApp,
          isActive: true,
        }),
      ]);
      expect(mockSyncStore.setLastSyncAt).toHaveBeenCalledWith(
        expect.any(Number),
      );
    });

    it("should return early when no accounts found", async () => {
      mockConnectionAccounts.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      expect(mockChatStore.setAccounts).not.toHaveBeenCalled();
      expect(mockConnectionConversations).not.toHaveBeenCalled();
    });

    it("should throw error when API fails", async () => {
      mockConnectionAccounts.mockRejectedValue(new Error("Network error"));

      await expect(engine.initialLoad()).rejects.toThrow("Network error");
    });

    it("should load conversations and participants for each account", async () => {
      const acc1 = createAccountEdge("acc-1");
      const acc2 = createAccountEdge("acc-2");
      mockConnectionAccounts.mockResolvedValue({
        edges: [acc1, acc2],
        totalCount: 2,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue({
        edges: [
          {
            nodeId: "conv-1",
            jid: "123@s.whatsapp.net",
            imtpWhatsappAccountId: "acc-1",
            cursor: "conv-1",
            data: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      expect(mockConnectionConversations).toHaveBeenCalledTimes(2);
      expect(mockConnectionParticipants).toHaveBeenCalledTimes(2);
      expect(mockChatStore.mergeImtpConversations).toHaveBeenCalledTimes(2);
    });

    it("should load messages for conversations during initial load", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue({
        edges: [
          {
            nodeId: "conv-1",
            jid: "123@s.whatsapp.net",
            imtpWhatsappAccountId: "acc-1",
            cursor: "conv-1",
            data: { name: "Chat 1" },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());
      mockConnectionMessages.mockResolvedValue({
        edges: [
          {
            nodeId: "msg-1",
            messageId: "msg-key-1",
            fromMe: false,
            remoteJid: "123@s.whatsapp.net",
            participant: null,
            participantAlt: null,
            imtpWhatsappAccountId: "acc-1",
            imtpWhatsappConversationId: "conv-1",
            cursor: "msg-1",
            data: { content: "Hello" },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo, endCursor: "msg-cursor-1" },
      } as any);

      mockChatStore.mergeImtpConversations.mockImplementation(
        ({ accountId }) => {
          mockChatStore.conversations = [
            {
              id: `${accountId}:conv-1`,
              accountId,
              jid: "123@s.whatsapp.net",
              contact: { id: "123@s.whatsapp.net" },
            },
          ] as any;
        },
      );

      await engine.initialLoad();

      expect(mockConnectionMessages).toHaveBeenCalledWith({
        accountId: "acc-1",
        conversationId: "conv-1",
        first: 50,
      });
      expect(mockChatStore.mergeImtpMessages).toHaveBeenCalledWith({
        accountId: "acc-1",
        messages: expect.arrayContaining([
          expect.objectContaining({ id: "msg-1" }),
        ]),
      });
    });
  });

  describe("startPolling / stopPolling", () => {
    it("should start polling and set isPolling=true", () => {
      mockChatStore.accounts = [];

      engine.startPolling();

      expect(mockSyncStore.setIsPolling).toHaveBeenCalledWith(true);
    });

    it("should not create multiple timers on repeated startPolling calls", () => {
      engine.startPolling();
      engine.startPolling();
      engine.startPolling();

      expect(mockSyncStore.setIsPolling).toHaveBeenCalledTimes(1);
    });

    it("should stop polling and set isPolling=false", () => {
      engine.startPolling();
      engine.stopPolling();

      expect(mockSyncStore.setIsPolling).toHaveBeenCalledWith(false);
    });

    it("should do nothing when stopPolling called without active polling", () => {
      engine.stopPolling();

      expect(mockSyncStore.setIsPolling).not.toHaveBeenCalled();
    });
  });

  describe("poll", () => {
    it("should poll conversations/messages/participants for each account", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();
      vi.clearAllMocks();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [];

      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionMessages.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockConnectionConversations).toHaveBeenCalled();
      expect(mockConnectionParticipants).toHaveBeenCalled();
    });

    it("should not execute when accounts list is empty", async () => {
      mockChatStore.accounts = [];

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockConnectionConversations).not.toHaveBeenCalled();
      expect(mockConnectionMessages).not.toHaveBeenCalled();
    });

    it("should reset retryCount and update lastSyncAt on success", async () => {
      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [];

      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockSyncStore.setLastSyncAt).toHaveBeenCalledWith(
        expect.any(Number),
      );
      expect(mockSyncStore.setError).toHaveBeenCalledWith(null);
    });
  });

  describe("pollConversations", () => {
    it("should poll and merge conversation data", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations
        .mockResolvedValueOnce(emptyConnectionResult())
        .mockResolvedValueOnce({
          edges: [
            {
              nodeId: "conv-1",
              jid: "123@s.whatsapp.net",
              imtpWhatsappAccountId: "acc-1",
              cursor: "conv-1",
              data: { name: "Chat 1" },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
          pageInfo: { ...emptyPageInfo, endCursor: "cursor-1" },
        } as any);
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [];

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockChatStore.mergeImtpConversations).toHaveBeenCalledWith({
        accountId: "acc-1",
        conversations: expect.arrayContaining([
          expect.objectContaining({ id: "conv-1" }),
        ]),
      });
    });

    it("should update cursor after polling", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations
        .mockResolvedValueOnce(emptyConnectionResult())
        .mockResolvedValueOnce({
          edges: [
            {
              nodeId: "conv-1",
              jid: "123@s.whatsapp.net",
              imtpWhatsappAccountId: "acc-1",
              cursor: "conv-1",
              data: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
          pageInfo: { ...emptyPageInfo, endCursor: "cursor-abc" },
        } as any)
        .mockResolvedValueOnce(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [];

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockConnectionConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ after: "cursor-abc" }),
      );
    });
  });

  describe("pollMessagesForAccount", () => {
    it("should poll messages for each conversation", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [
        { id: "acc-1:conv-1", accountId: "acc-1", contact: { id: "c1" } },
        { id: "acc-1:conv-2", accountId: "acc-1", contact: { id: "c2" } },
      ];

      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());
      mockConnectionMessages.mockResolvedValue({
        edges: [
          {
            nodeId: "msg-1",
            messageId: "msg-key-1",
            fromMe: false,
            remoteJid: "123@s.whatsapp.net",
            participant: null,
            participantAlt: null,
            imtpWhatsappAccountId: "acc-1",
            imtpWhatsappConversationId: "conv-1",
            cursor: "msg-1",
            data: { content: "Hello" },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo, endCursor: "msg-cursor-1" },
      } as any);

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockConnectionMessages).toHaveBeenCalledTimes(2);
      expect(mockConnectionMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "acc-1",
          conversationId: "conv-1",
        }),
      );
      expect(mockConnectionMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "acc-1",
          conversationId: "conv-2",
        }),
      );
    });

    it("should update message cursor per conversation", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [
        { id: "acc-1:conv-1", accountId: "acc-1", contact: { id: "c1" } },
      ];

      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());
      mockConnectionMessages
        .mockResolvedValueOnce({
          edges: [
            {
              nodeId: "msg-1",
              messageId: "m1",
              fromMe: false,
              remoteJid: "x@s.whatsapp.net",
              imtpWhatsappAccountId: "acc-1",
              imtpWhatsappConversationId: "conv-1",
              cursor: "msg-1",
              data: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
          pageInfo: { ...emptyPageInfo, endCursor: "msg-cursor-abc" },
        } as any)
        .mockResolvedValueOnce(emptyConnectionResult());

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockConnectionMessages).toHaveBeenLastCalledWith(
        expect.objectContaining({ after: "msg-cursor-abc" }),
      );
    });
  });

  describe("pollParticipants", () => {
    it("should poll and merge participant data", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants
        .mockResolvedValueOnce(emptyConnectionResult())
        .mockResolvedValueOnce({
          edges: [
            {
              nodeId: "p-1",
              jid: "456@s.whatsapp.net",
              lid: "",
              imtpWhatsappAccountId: "acc-1",
              cursor: "p-1",
              data: { name: "User 456" },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
          pageInfo: { ...emptyPageInfo, endCursor: "part-cursor-1" },
        } as any);

      await engine.initialLoad();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [];

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockChatStore.mergeImtpParticipants).toHaveBeenCalledWith({
        accountId: "acc-1",
        participants: expect.arrayContaining([
          expect.objectContaining({ id: "p-1" }),
        ]),
      });
    });

    it("should update participant cursor after polling", async () => {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants
        .mockResolvedValueOnce(emptyConnectionResult())
        .mockResolvedValueOnce({
          edges: [
            {
              nodeId: "p-1",
              jid: "456@s.whatsapp.net",
              lid: "",
              imtpWhatsappAccountId: "acc-1",
              cursor: "p-1",
              data: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
          pageInfo: { ...emptyPageInfo, endCursor: "part-cursor-xyz" },
        } as any)
        .mockResolvedValueOnce(emptyConnectionResult());

      await engine.initialLoad();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [];

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockConnectionParticipants).toHaveBeenLastCalledWith(
        expect.objectContaining({ after: "part-cursor-xyz" }),
      );
    });
  });

  describe("handleError", () => {
    async function initEngineWithAccount() {
      const accountEdge = createAccountEdge("acc-1");
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();
      vi.clearAllMocks();

      mockChatStore.accounts = [
        { id: "acc-1", name: "Test", platform: EPlatformWhatsApp },
      ];
      mockChatStore.conversations = [];
    }

    it("should increment retry count and schedule retry", async () => {
      await initEngineWithAccount();
      mockConnectionConversations.mockRejectedValue(new Error("API error"));

      engine.startPolling();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockSyncStore.setError).not.toHaveBeenCalledWith(
        "同步失败，请检查网络连接",
      );
    });

    it("should set error after MAX_RETRIES exceeded", async () => {
      await initEngineWithAccount();
      mockConnectionConversations.mockRejectedValue(new Error("API error"));

      engine.startPolling();

      // 1st poll (immediate) -> error -> handleError(1) -> retry at 1s
      await vi.advanceTimersByTimeAsync(0);
      // 1st retry -> error -> handleError(2) -> retry at 2s
      await vi.advanceTimersByTimeAsync(1000);
      // 2nd retry -> error -> handleError(3) -> retry at 4s
      await vi.advanceTimersByTimeAsync(2000);
      // 3rd retry -> error -> handleError(4) -> MAX_RETRIES exceeded
      await vi.advanceTimersByTimeAsync(4000);

      expect(mockSyncStore.setError).toHaveBeenCalledWith(
        "同步失败，请检查网络连接",
      );
    });
  });

  describe("toAccount", () => {
    it("should correctly convert account format", async () => {
      const accountEdge = createAccountEdge("acc-1", "12345@s.whatsapp.net", {
        name: "My WhatsApp",
        avatar: "https://avatar.url",
      });
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      expect(mockChatStore.setAccounts).toHaveBeenCalledWith([
        {
          id: "acc-1",
          name: "My WhatsApp",
          platform: EPlatformWhatsApp,
          avatar: "https://avatar.url",
          isActive: true,
        },
      ]);
    });

    it("should fallback to jid prefix when name is missing", async () => {
      const accountEdge = createAccountEdge(
        "acc-1",
        "12345@s.whatsapp.net",
        {},
      );
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      expect(mockChatStore.setAccounts).toHaveBeenCalledWith([
        expect.objectContaining({ name: "12345" }),
      ]);
    });

    it("should fallback to 'WhatsApp' when both name and jid are missing", async () => {
      const accountEdge = createAccountEdge("acc-1");
      accountEdge.jid = null as any;
      accountEdge.data = {};
      mockConnectionAccounts.mockResolvedValue({
        edges: [accountEdge],
        totalCount: 1,
        pageInfo: { ...emptyPageInfo },
      } as any);
      mockConnectionConversations.mockResolvedValue(emptyConnectionResult());
      mockConnectionParticipants.mockResolvedValue(emptyConnectionResult());

      await engine.initialLoad();

      expect(mockChatStore.setAccounts).toHaveBeenCalledWith([
        expect.objectContaining({ name: "WhatsApp" }),
      ]);
    });
  });
});
