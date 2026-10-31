export interface IUser {
  id: string;
  name: string;
  blocked: boolean;
  uin: string;
  accessToken?: string;
}
