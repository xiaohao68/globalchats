import { gql } from "@apollo/client";

/**
 * IM Whatsapp GraphQL 操作定义
 */

// 获取账号列表
export const IM_WHATSAPP_ACCOUNTS_QUERY = gql`
  query ImWhatsappAccounts($input: ImWhatsappAccountConnectionInput) {
    im {
      whatsapp {
        accounts(input: $input) {
          edges {
            cursor
            nodeId
            lid
            jid
            hijackWorkspaceMemberId
            assignWorkspaceMemberId
            data
            createdAt
            updatedAt
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    }
  }
`;

// 获取对话列表
export const IM_WHATSAPP_CONVERSATIONS_QUERY = gql`
  query ImWhatsappConversations($input: ImWhatsappConversationConnectionInput) {
    im {
      whatsapp {
        conversations(input: $input) {
          edges {
            cursor
            nodeId
            imWhatsappAccountId
            jid
            assignWorkspaceMemberId
            data
            createdAt
            updatedAt
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    }
  }
`;

export const IM_WHATSAPP_UPDATE_ACCOUNT_MUTATION = gql`
  mutation ImWhatsappUpdateAccount($input: ImWhatsappUpdateAccountInput!) {
    im {
      whatsapp {
        updateAccount(input: $input) {
          accountId
          assignWorkspaceMemberId
          hijackWorkspaceMemberId
          updatedAt
        }
      }
    }
  }
`;

export const IM_WHATSAPP_UPDATE_CONVERSATION_MUTATION = gql`
  mutation ImWhatsappUpdateConversation($input: ImWhatsappUpdateConversationInput!) {
    im {
      whatsapp {
        updateConversation(input: $input) {
          conversationId
          assignWorkspaceMemberId
          updatedAt
        }
      }
    }
  }
`;

// 获取消息列表
export const IM_WHATSAPP_MESSAGES_QUERY = gql`
  query ImWhatsappMessages($input: ImWhatsappMessageConnectionInput) {
    im {
      whatsapp {
        messages(input: $input) {
          edges {
            cursor
            nodeId
            imWhatsappAccountId
            imWhatsappConversationId
            fromMe
            remoteJid
            messageId
            participant
            participantAlt
            data
            createdAt
            updatedAt
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    }
  }
`;

// 获取工作区成员列表
export const WORKSPACE_MEMBERS_QUERY = gql`
  query WorkspaceMembers {
    workspace {
      members {
        id
        userId
        email
        name
        role
        status
      }
    }
  }
`;
