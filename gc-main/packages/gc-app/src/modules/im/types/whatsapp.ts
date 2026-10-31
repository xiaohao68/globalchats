export const DEFAULT_PAGE_SIZE = 10;

export interface ConnectionPageInfo {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

export interface ConnectionPaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

export interface WorkspaceMembersData {
  workspace: {
    members: WorkspaceMember[];
  };
}

export interface WhatsAppAccountEdge {
  cursor: string;
  nodeId: string;
  lid: string;
  jid: string;
  hijackWorkspaceMemberId: string;
  assignWorkspaceMemberId: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppAccountsData {
  im: {
    whatsapp: {
      accounts: {
        edges: WhatsAppAccountEdge[];
        pageInfo: ConnectionPageInfo;
        totalCount: number;
      };
    };
  };
}

export interface WhatsAppConversationEdge {
  cursor: string;
  nodeId: string;
  imWhatsappAccountId: string;
  jid: string;
  assignWorkspaceMemberId: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversationsData {
  im: {
    whatsapp: {
      conversations: {
        edges: WhatsAppConversationEdge[];
        pageInfo: ConnectionPageInfo;
        totalCount: number;
      };
    };
  };
}

export interface WhatsAppMessageEdge {
  cursor: string;
  nodeId: string;
  imWhatsappAccountId: string;
  imWhatsappConversationId: string;
  fromMe: boolean;
  remoteJid: string;
  messageId: string;
  participant: string | null;
  participantAlt: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessagesData {
  im: {
    whatsapp: {
      messages: {
        edges: WhatsAppMessageEdge[];
        pageInfo: ConnectionPageInfo;
        totalCount: number;
      };
    };
  };
}
