import { gql } from "@apollo/client"

export const IM_WHATSAPP_AGGREGATE_CONVERSATIONS_QUERY = gql`
  query ImWhatsappAggregateConversations($input: ImWhatsappListAggregateConversationsInput) {
    im {
      whatsapp {
        listAggregateConversations(input: $input) {
          provider
          conversationId
          accountId
          title
          summary
          conversationJid
          accountJid
          lastMessagePreview
          lastMessageDirection
          lastMessageStatus
          lastMessageAt
          conversationAssigneeMemberId
          accountAssigneeMemberId
          visibilitySource
          updatedAt
        }
      }
    }
  }
`

export const IM_WHATSAPP_AGGREGATE_MESSAGES_QUERY = gql`
  query ImWhatsappAggregateMessages($input: ImWhatsappListAggregateMessagesInput!) {
    im {
      whatsapp {
        listAggregateMessages(input: $input) {
          provider
          rowId
          conversationId
          accountId
          providerMessageId
          direction
          preview
          status
          senderId
          participant
          participantAlt
          remoteJid
          raw
          createdAt
          updatedAt
        }
      }
    }
  }
`

export const IM_WHATSAPP_SEND_AGGREGATE_MESSAGE_MUTATION = gql`
  mutation ImWhatsappSendAggregateMessage($input: ImWhatsappSendAggregateMessageInput!) {
    im {
      whatsapp {
        sendAggregateMessage(input: $input) {
          success
          commandId
          accountId
          conversationId
          scheduledAt
        }
      }
    }
  }
`
