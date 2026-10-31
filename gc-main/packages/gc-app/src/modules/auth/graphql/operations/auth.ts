import { gql } from "@apollo/client";

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        username
        avatar
        currentWorkspace {
          id
          shardingKey
          displayName
          status
          logo
          role
        }
      }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      username
      avatar
      isAdmin
      currentWorkspace {
        id
        shardingKey
        displayName
        status
        logo
        role
      }
      workspaces {
        id
        displayName
        logo
        role
        isCurrent
        accessToken
      }
    }
  }
`;
