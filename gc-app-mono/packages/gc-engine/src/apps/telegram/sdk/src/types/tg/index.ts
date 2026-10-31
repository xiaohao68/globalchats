import type { ApiMessage, ApiPoll, ApiWebPage } from "./messages";

export type ApiUpdateNewMessage = {
  "@type": "newMessage";
  chatId: string;
  id: number;
  message: Partial<ApiMessage>;
  shouldForceReply?: boolean;
  wasDrafted?: boolean;
  poll?: ApiPoll;
  webPage?: ApiWebPage;
};

export type ApiUpdateMessageSendSucceeded = {
  "@type": "updateMessageSendSucceeded";
  chatId: string;
  localId: number;
  message: ApiMessage;
  poll?: ApiPoll;
  webPage?: ApiWebPage;
};

export type ApiUpdate = ApiUpdateNewMessage | ApiUpdateMessageSendSucceeded;

type ApiUserType =
  | "userTypeBot"
  | "userTypeRegular"
  | "userTypeDeleted"
  | "userTypeUnknown";

interface ApiUsername {
  username: string;
  isActive?: boolean;
  isEditable?: boolean;
}

type ApiFakeType = "fake" | "scam";

interface ApiEmojiStatusCollectible {
  type: "collectible";
  collectibleId: string;
  documentId: string;
  title: string;
  slug: string;
  patternDocumentId: string;
  centerColor: string;
  edgeColor: string;
  patternColor: string;
  textColor: string;
  until?: number;
}

type ApiEmojiStatusType = ApiEmojiStatus | ApiEmojiStatusCollectible;

interface ApiEmojiStatus {
  type: "regular";
  documentId: string;
  until?: number;
}

interface ApiPeerColor {
  color?: number;
  backgroundEmojiId?: string;
}

export interface ApiUser {
  id: string;
  isMin: boolean;
  isSelf?: true;
  isVerified?: true;
  isPremium?: boolean;
  isCloseFriend?: boolean;
  isContact?: true;
  isSupport?: true;
  type: ApiUserType;
  firstName?: string;
  lastName?: string;
  noStatus?: boolean;
  usernames?: ApiUsername[];
  hasUsername?: boolean;
  phoneNumber: string;
  accessHash?: string;
  hasVideoAvatar?: boolean;
  avatarPhotoId?: string;
  botPlaceholder?: string;
  canBeInvitedToGroup?: boolean;
  fakeType?: ApiFakeType;
  isAttachBot?: boolean;
  emojiStatus?: ApiEmojiStatusType;
  areStoriesHidden?: boolean;
  hasStories?: boolean;
  hasUnreadStories?: boolean;
  maxStoryId?: number;
  color?: ApiPeerColor;
  profileColor?: ApiPeerColor;
  canEditBot?: boolean;
  hasMainMiniApp?: boolean;
  botActiveUsers?: number;
  botVerificationIconId?: string;
  paidMessagesStars?: number;
}
