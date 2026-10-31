import { gql } from "@apollo/client";

/**
 * Workspace 成员 GraphQL 操作定义
 */

// 获取成员列表
export const WORKSPACE_MEMBERS_QUERY = gql`
  query WorkspaceMembers {
    workspace {
      members {
        id
        userId
        email
        name
        bio
        themePreset
        themeRadius
        themeScale
        themeContentLayout
        themeMode
        sidebarMode
        language
        role
        status
        invitedAt
        joinedAt
        declinedAt
      }
      inviteLink {
        code
        path
        enabled
      }
    }
  }
`;

export const SET_WORKSPACE_INVITE_LINK_ENABLED_MUTATION = gql`
  mutation SetWorkspaceInviteLinkEnabled($enabled: Boolean!) {
    workspace {
      setInviteLinkEnabled(enabled: $enabled) {
        code
        path
        enabled
      }
    }
  }
`;

export const REGENERATE_WORKSPACE_INVITE_LINK_MUTATION = gql`
  mutation RegenerateWorkspaceInviteLink {
    workspace {
      regenerateInviteLink {
        code
        path
        enabled
      }
    }
  }
`;

// 更新成员信息
export const UPDATE_WORKSPACE_MEMBER_MUTATION = gql`
  mutation UpdateWorkspaceMember($input: UpdateWorkspaceMemberInput!) {
    workspace {
      updateMember(input: $input) {
        id
        userId
        email
        name
        bio
        role
        status
      }
    }
  }
`;

export const UPDATE_WORKSPACE_MEMBER_PREFERENCES_MUTATION = gql`
  mutation UpdateWorkspaceMemberPreferences($input: UpdateWorkspaceMemberPreferencesInput!) {
    workspace {
      updateMemberPreferences(input: $input) {
        id
        userId
        email
        name
        bio
        themePreset
        themeRadius
        themeScale
        themeContentLayout
        themeMode
        sidebarMode
        language
        role
        status
      }
    }
  }
`;

export const UPDATE_WORKSPACE_GENERAL_MUTATION = gql`
  mutation UpdateWorkspaceGeneral($input: UpdateWorkspaceGeneralInput!) {
    workspace {
      updateGeneral(input: $input) {
        id
        displayName
        logo
      }
    }
  }
`;

// 更新成员角色
export const UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION = gql`
  mutation UpdateWorkspaceMemberRole($input: UpdateWorkspaceMemberRoleInput!) {
    workspace {
      updateMemberRole(input: $input) {
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

// 删除成员
export const DELETE_WORKSPACE_MEMBER_MUTATION = gql`
  mutation DeleteWorkspaceMember($workspaceMemberId: ID!) {
    workspace {
      deleteMember(workspaceMemberId: $workspaceMemberId)
    }
  }
`;

export const WORKSPACE_INVITE_PREVIEW_QUERY = gql`
  query WorkspaceInvite($code: String!) {
    workspaceInvite(code: $code) {
      status
      workspaceDisplayName
      path
    }
  }
`;

export const ACCEPT_WORKSPACE_INVITE_MUTATION = gql`
  mutation AcceptWorkspaceInvite($code: String!) {
    acceptWorkspaceInvite(code: $code) {
      workspaceId
      workspaceDisplayName
      joined
      role
    }
  }
`;
