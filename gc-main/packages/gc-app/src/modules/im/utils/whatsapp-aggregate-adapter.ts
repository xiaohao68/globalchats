import { apolloClient } from "@/modules/auth/utils/apollo-client"
import {
  IM_WHATSAPP_AGGREGATE_CONVERSATIONS_QUERY,
  IM_WHATSAPP_AGGREGATE_MESSAGES_QUERY,
  IM_WHATSAPP_SEND_AGGREGATE_MESSAGE_MUTATION,
} from "@/modules/im/graphql/operations/im-aggregate"
import {
  AggregateConversationListItem,
  AggregateMessageDirection,
  AggregateMessageItem,
  AggregateProviderAdapter,
  AggregateRealtimeEvent,
  AggregateScope,
  AggregateSendMessageResult,
} from "@/modules/im/types/aggregate"

interface WhatsAppAggregateConversationsResponse {
  im: {
    whatsapp: {
      listAggregateConversations: AggregateConversationListItem[]
    }
  }
}

interface WhatsAppAggregateMessagesResponse {
  im: {
    whatsapp: {
      listAggregateMessages: AggregateMessageItem[]
    }
  }
}

interface WhatsAppSendAggregateMessageResponse {
  im: {
    whatsapp: {
      sendAggregateMessage: AggregateSendMessageResult
    }
  }
}

function parsePayload(payload: unknown): AggregateRealtimeEvent | null {
  if (!payload) return null

  const parsedPayload =
    typeof payload === "string"
      ? (JSON.parse(payload) as AggregateRealtimeEvent)
      : (payload as AggregateRealtimeEvent)

  if (!parsedPayload?.eventId || parsedPayload.provider !== "WHATSAPP") {
    return null
  }

  return parsedPayload
}

function normalizeDirection(value: unknown): AggregateMessageDirection | null {
  if (value === "inbound" || value === "INBOUND") return "inbound"
  if (value === "outbound" || value === "OUTBOUND") return "outbound"
  return null
}

function normalizeConversation(
  conversation: AggregateConversationListItem,
): AggregateConversationListItem {
  return {
    ...conversation,
    lastMessageDirection: normalizeDirection(conversation.lastMessageDirection),
  }
}

function normalizeMessage(message: AggregateMessageItem): AggregateMessageItem {
  return {
    ...message,
    direction: normalizeDirection(message.direction) || "inbound",
  }
}

export const whatsappAggregateAdapter: AggregateProviderAdapter = {
  provider: "WHATSAPP",
  async listConversations(input) {
    const { data } = await apolloClient.query<WhatsAppAggregateConversationsResponse>({
      query: IM_WHATSAPP_AGGREGATE_CONVERSATIONS_QUERY,
      variables: {
        input: {
          scope: input.scope,
          search: input.search || undefined,
          limit: input.limit,
        },
      },
      fetchPolicy: "network-only",
    })

    return (data?.im?.whatsapp?.listAggregateConversations || []).map(normalizeConversation)
  },
  async listMessages(input) {
    const { data } = await apolloClient.query<WhatsAppAggregateMessagesResponse>({
      query: IM_WHATSAPP_AGGREGATE_MESSAGES_QUERY,
      variables: {
        input: {
          conversationId: input.conversationId,
          scope: input.scope,
          limit: input.limit,
        },
      },
      fetchPolicy: "network-only",
    })

    return (data?.im?.whatsapp?.listAggregateMessages || []).map(normalizeMessage)
  },
  async sendMessage(input) {
    const { data } = await apolloClient.mutate<WhatsAppSendAggregateMessageResponse>({
      mutation: IM_WHATSAPP_SEND_AGGREGATE_MESSAGE_MUTATION,
      variables: {
        input: {
          conversationId: input.conversationId,
          text: input.text,
        },
      },
    })

    const result = data?.im?.whatsapp?.sendAggregateMessage
    if (!result?.success) {
      throw new Error("Failed to enqueue WhatsApp message command")
    }

    return result
  },
  getBaseChannels(input) {
    const channels = [`private-im.member.${input.workspaceMemberId}`]
    if (input.isWorkspaceManager && input.workspaceId) {
      channels.push(`private-im.workspace-admin.${input.workspaceId}`)
    }
    return channels
  },
  getThreadChannelName(conversationId) {
    return `private-im.thread.whatsapp.${conversationId}`
  },
  parseRealtimeEvent(eventName, payload) {
    if (!eventName.startsWith("im.")) return null

    try {
      return parsePayload(payload)
    } catch {
      return null
    }
  },
}

export function resolveAggregateScope(input: {
  isWorkspaceManager: boolean
  scope: AggregateScope
}): AggregateScope {
  if (!input.isWorkspaceManager) return "MINE"
  return input.scope
}
