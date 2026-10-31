export type AggregateProviderKind = "WHATSAPP"
export type AggregateScope = "MINE" | "ALL"
export type AggregateVisibilitySource =
  | "conversation_assigned"
  | "account_assigned"
  | "admin_override"
export type AggregateMessageDirection = "inbound" | "outbound"

export interface AggregateConversationListItem {
  provider: AggregateProviderKind
  conversationId: string
  accountId: string
  title: string
  summary: string
  conversationJid: string
  accountJid?: string | null
  lastMessagePreview?: string | null
  lastMessageDirection?: AggregateMessageDirection | null
  lastMessageStatus?: string | null
  lastMessageAt?: string | null
  conversationAssigneeMemberId?: string | null
  accountAssigneeMemberId?: string | null
  visibilitySource: AggregateVisibilitySource
  updatedAt: string
}

export interface AggregateMessageItem {
  provider: AggregateProviderKind
  rowId: string
  conversationId: string
  accountId: string
  providerMessageId: string
  direction: AggregateMessageDirection
  preview?: string | null
  status?: string | null
  senderId?: string | null
  participant?: string | null
  participantAlt?: string | null
  remoteJid: string
  raw?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface AggregateSendMessageResult {
  success: boolean
  commandId: string
  accountId: string
  conversationId: string
  scheduledAt: string
}

export interface AggregateRealtimeEvent {
  seq?: number
  eventId: string
  provider: AggregateProviderKind
  scopeType: "member" | "account" | "thread"
  scopeId: string
  entityType: "account" | "thread" | "message" | "participant" | "assignment"
  eventType: string
  occurredAt: string
  dedupeKey: string
  schemaVersion: number
  payload: Record<string, unknown>
}

export interface AggregateProviderAdapter {
  provider: AggregateProviderKind
  listConversations: (input: {
    scope: AggregateScope
    search?: string
    limit?: number
  }) => Promise<AggregateConversationListItem[]>
  listMessages: (input: {
    conversationId: string
    scope: AggregateScope
    limit?: number
  }) => Promise<AggregateMessageItem[]>
  sendMessage: (input: {
    conversationId: string
    text: string
  }) => Promise<AggregateSendMessageResult>
  getBaseChannels: (input: {
    workspaceMemberId: string
    workspaceId?: string | null
    isWorkspaceManager: boolean
  }) => string[]
  getThreadChannelName: (conversationId: string) => string
  parseRealtimeEvent: (
    eventName: string,
    payload: unknown,
  ) => AggregateRealtimeEvent | null
}

export interface AggregateProviderTheme {
  badgeLabel: string
  accentClassName: string
  surfaceClassName: string
}

export const AGGREGATE_PROVIDER_THEMES: Record<AggregateProviderKind, AggregateProviderTheme> = {
  WHATSAPP: {
    badgeLabel: "WhatsApp",
    accentClassName: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    surfaceClassName: "bg-linear-to-br from-emerald-500/10 via-background to-background",
  },
}
