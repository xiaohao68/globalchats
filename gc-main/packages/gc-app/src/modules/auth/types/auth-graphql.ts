export interface Workspace {
  id: string;
  shardingKey: string;
  displayName: string;
  status: string;
  logo: string | null;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  isAdmin: boolean;
  currentWorkspace?: Workspace | null;
}

export interface LoginInput {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface LoginMutationData {
  login: {
    accessToken: string;
    user: AuthUser;
  };
}

export interface MeQueryData {
  me: AuthUser;
}
